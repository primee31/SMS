import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

// Auto-generate sequential quotation numbers like QUO-2026-0001
async function generateQuotationNumber() {
  const year = new Date().getFullYear();
  const prefix = `QUO-${year}-`;
  const last = await prisma.quotation.findFirst({
    where: { quotationNumber: { startsWith: prefix } },
    orderBy: { quotationNumber: 'desc' },
    select: { quotationNumber: true },
  });

  let seq = 1;
  if (last) {
    const parts = last.quotationNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// Calculate totals from lines
function computeTotals(lines) {
  let subtotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  const computedLines = lines.map((line) => {
    const unitNet = Number(line.unitPrice) + Number(line.additionalPrice || 0);
    const lineSubtotal = unitNet * line.quantity;
    const lineDiscount = Number(line.discountAmount || 0);
    const lineTax = Number(line.taxAmount || 0);
    const lineTotal = lineSubtotal - lineDiscount + lineTax;

    subtotal += lineSubtotal;
    discountTotal += lineDiscount;
    taxTotal += lineTax;

    return {
      ...line,
      additionalPrice: line.additionalPrice || 0,
      discountAmount: lineDiscount,
      taxAmount: lineTax,
      subtotal: Math.round(lineSubtotal * 100) / 100,
      total: Math.round(lineTotal * 100) / 100,
    };
  });

  const grandTotal = subtotal - discountTotal + taxTotal;
  return {
    computedLines,
    subtotal: Math.round(subtotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

const QUOTATION_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, company: true } },
  plan: { select: { id: true, name: true, code: true, billingFrequency: true, price: true } },
  template: { select: { id: true, name: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  lines: {
    include: {
      product: { select: { id: true, name: true, type: true } },
      variant: { select: { id: true, name: true } },
    },
  },
  subscriptions: { select: { id: true, subscriptionNumber: true, status: true } },
};

export async function listQuotations(query, currentUser) {
  const { page, limit, search, status, customerId, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    // Customers can only see their own quotations
    ...(currentUser.role === 'CUSTOMER' && currentUser.customer
      ? { customerId: currentUser.customer.id }
      : customerId && { customerId }),
    ...(search && {
      OR: [
        { quotationNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.quotation.count({ where }),
    prisma.quotation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { lines: true } },
      },
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createQuotation(data, currentUserId, ipAddress, userAgent) {
  const { lines, ...quotationData } = data;

  // Validate customer exists
  const customer = await prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } });
  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const { computedLines, subtotal, taxTotal, discountTotal, grandTotal } = computeTotals(lines);
  const quotationNumber = await generateQuotationNumber();

  const quotation = await prisma.$transaction(async (tx) => {
    const created = await tx.quotation.create({
      data: {
        quotationNumber,
        customerId: quotationData.customerId,
        planId: quotationData.planId || null,
        templateId: quotationData.templateId || null,
        createdById: currentUserId,
        validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : null,
        notes: quotationData.notes,
        terms: quotationData.terms,
        subtotal,
        taxTotal,
        discountTotal,
        grandTotal,
        status: 'DRAFT',
      },
    });

    await tx.quotationLine.createMany({
      data: computedLines.map((l) => ({
        quotationId: created.id,
        productId: l.productId,
        variantId: l.variantId || null,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        additionalPrice: l.additionalPrice,
        discountAmount: l.discountAmount,
        taxAmount: l.taxAmount,
        subtotal: l.subtotal,
        total: l.total,
      })),
    });

    return tx.quotation.findUnique({ where: { id: created.id }, include: QUOTATION_INCLUDE });
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Quotation',
    entityId: quotation.id,
    newValues: { quotationNumber, customerId: data.customerId, grandTotal },
    ipAddress,
    userAgent,
  });

  return quotation;
}

export async function getQuotationById(id, currentUser) {
  const quotation = await prisma.quotation.findFirst({
    where: { id, deletedAt: null },
    include: QUOTATION_INCLUDE,
  });

  if (!quotation) {
    const err = new Error('Quotation not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Customers may only access their own quotation
  if (currentUser?.role === 'CUSTOMER' && currentUser.customer?.id !== quotation.customerId) {
    const err = new Error('Access forbidden');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return quotation;
}

export async function updateQuotation(id, data, currentUser, ipAddress, userAgent) {
  const existing = await getQuotationById(id, currentUser);

  if (!['DRAFT'].includes(existing.status)) {
    const err = new Error(`Cannot edit a quotation in status: ${existing.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const { lines, ...quotationData } = data;

  let totals = {};
  let computedLines = [];

  if (lines && lines.length > 0) {
    const computed = computeTotals(lines);
    computedLines = computed.computedLines;
    totals = {
      subtotal: computed.subtotal,
      taxTotal: computed.taxTotal,
      discountTotal: computed.discountTotal,
      grandTotal: computed.grandTotal,
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quotation.update({
      where: { id },
      data: {
        ...quotationData,
        ...(quotationData.validUntil !== undefined && {
          validUntil: quotationData.validUntil ? new Date(quotationData.validUntil) : null,
        }),
        ...totals,
      },
    });

    if (computedLines.length > 0) {
      await tx.quotationLine.deleteMany({ where: { quotationId: id } });
      await tx.quotationLine.createMany({
        data: computedLines.map((l) => ({
          quotationId: id,
          productId: l.productId,
          variantId: l.variantId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          additionalPrice: l.additionalPrice,
          discountAmount: l.discountAmount,
          taxAmount: l.taxAmount,
          subtotal: l.subtotal,
          total: l.total,
        })),
      });
    }

    return tx.quotation.findUnique({ where: { id }, include: QUOTATION_INCLUDE });
  });

  await logAudit({
    userId: currentUser.id,
    action: 'UPDATE',
    entity: 'Quotation',
    entityId: id,
    oldValues: { status: existing.status, grandTotal: existing.grandTotal },
    newValues: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function changeQuotationStatus(id, newStatus, currentUser, ipAddress, userAgent) {
  const existing = await getQuotationById(id, currentUser);

  // Status transition rules
  const allowed = {
    DRAFT: ['SENT', 'CANCELLED'],
    SENT: ['CONFIRMED', 'CANCELLED', 'EXPIRED'],
    CONFIRMED: ['CANCELLED'],
    CANCELLED: [],
    EXPIRED: [],
  };

  if (!allowed[existing.status]?.includes(newStatus)) {
    const err = new Error(`Cannot transition from ${existing.status} to ${newStatus}`);
    err.statusCode = 400;
    err.code = 'INVALID_TRANSITION';
    throw err;
  }

  const updated = await prisma.quotation.update({
    where: { id },
    data: { status: newStatus },
    include: QUOTATION_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'STATUS_CHANGE',
    entity: 'Quotation',
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: newStatus },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function convertToSubscription(id, data, currentUser, ipAddress, userAgent) {
  const quotation = await getQuotationById(id, currentUser);

  if (quotation.status !== 'CONFIRMED') {
    const err = new Error('Only confirmed quotations can be converted to subscriptions');
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  if (!quotation.planId) {
    const err = new Error('Quotation must have a plan to convert to subscription');
    err.statusCode = 400;
    err.code = 'NO_PLAN';
    throw err;
  }

  // Check if already converted
  if (quotation.subscriptions && quotation.subscriptions.length > 0) {
    const active = quotation.subscriptions.find((s) => !['CANCELLED', 'CLOSED'].includes(s.status));
    if (active) {
      const err = new Error('Quotation already has an active subscription');
      err.statusCode = 409;
      err.code = 'ALREADY_CONVERTED';
      throw err;
    }
  }

  const plan = quotation.plan;
  const startDate = data.startDate ? new Date(data.startDate) : new Date();
  const billingFrequency = data.billingFrequency || plan.billingFrequency;

  // Calculate initial period end based on billing frequency
  const periodEnd = computePeriodEnd(startDate, billingFrequency);
  const nextBillingDate = new Date(periodEnd);

  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;
  const lastSub = await prisma.subscription.findFirst({
    where: { subscriptionNumber: { startsWith: prefix } },
    orderBy: { subscriptionNumber: 'desc' },
    select: { subscriptionNumber: true },
  });
  let seq = 1;
  if (lastSub) {
    const parts = lastSub.subscriptionNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  const subscriptionNumber = `${prefix}${String(seq).padStart(4, '0')}`;

  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        subscriptionNumber,
        customerId: quotation.customerId,
        planId: quotation.planId,
        quotationId: id,
        status: 'ACTIVE',
        billingFrequency,
        startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: periodEnd,
        nextBillingDate,
        basePrice: plan.price,
        recurringTotal: quotation.grandTotal,
        autoRenew: true,
        notes: data.notes || quotation.notes,
      },
    });

    // Create subscription lines from quotation lines
    await tx.subscriptionLine.createMany({
      data: quotation.lines.map((ql) => ({
        subscriptionId: sub.id,
        productId: ql.productId,
        variantId: ql.variantId || null,
        description: ql.description,
        quantity: ql.quantity,
        unitPrice: ql.unitPrice,
        additionalPrice: ql.additionalPrice,
        subtotal: ql.subtotal,
      })),
    });

    return tx.subscription.findUnique({
      where: { id: sub.id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, code: true } },
        lines: { include: { product: { select: { id: true, name: true } } } },
      },
    });
  });

  await logAudit({
    userId: currentUser.id,
    action: 'CONVERT_TO_SUBSCRIPTION',
    entity: 'Quotation',
    entityId: id,
    newValues: { subscriptionId: subscription.id, subscriptionNumber },
    ipAddress,
    userAgent,
  });

  return subscription;
}

export async function deleteQuotation(id, currentUser, ipAddress, userAgent) {
  const existing = await getQuotationById(id, currentUser);

  if (!['DRAFT', 'CANCELLED'].includes(existing.status)) {
    const err = new Error('Only draft or cancelled quotations can be deleted');
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });

  await logAudit({
    userId: currentUser.id,
    action: 'SOFT_DELETE',
    entity: 'Quotation',
    entityId: id,
    ipAddress,
    userAgent,
  });

  return { success: true, message: 'Quotation deleted successfully' };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

export function computePeriodEnd(startDate, billingFrequency) {
  const end = new Date(startDate);
  switch (billingFrequency) {
    case 'DAILY':
      end.setDate(end.getDate() + 1);
      break;
    case 'WEEKLY':
      end.setDate(end.getDate() + 7);
      break;
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      break;
    case 'YEARLY':
      end.setFullYear(end.getFullYear() + 1);
      break;
  }
  // Period ends just before the next billing date
  end.setDate(end.getDate() - 1);
  return end;
}
