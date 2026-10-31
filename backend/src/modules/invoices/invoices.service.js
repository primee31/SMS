import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.invoiceNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const INVOICE_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, company: true } },
  subscription: {
    select: {
      id: true,
      subscriptionNumber: true,
      billingFrequency: true,
      plan: { select: { id: true, name: true, code: true } },
    },
  },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  lines: {
    include: {
      product: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
      tax: { select: { id: true, name: true, rate: true } },
    },
  },
  payments: {
    orderBy: { paidAt: 'desc' },
  },
  discountUsages: {
    include: { discount: { select: { id: true, code: true, type: true, value: true } } },
  },
};

export async function listInvoices(query, currentUser) {
  const { page, limit, search, status, customerId, subscriptionId, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(subscriptionId && { subscriptionId }),
    ...(currentUser.role === 'CUSTOMER' && currentUser.customer
      ? { customerId: currentUser.customer.id }
      : customerId && { customerId }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: {
          select: {
            id: true,
            subscriptionNumber: true,
            plan: { select: { id: true, name: true } },
          },
        },
        _count: { select: { lines: true, payments: true } },
      },
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

/**
 * Core function: Generate an invoice from a subscription for a billing period.
 * Idempotent — uses @@unique([subscriptionId, billingPeriodStart, billingPeriodEnd]).
 */
export async function generateInvoiceForSubscription(subscriptionId, billingPeriodStart, billingPeriodEnd, createdById = null) {
  const subscription = await prisma.subscription.findFirst({
    where: { id: subscriptionId, deletedAt: null },
    include: {
      lines: {
        include: {
          product: true,
          variant: true,
        },
      },
      customer: true,
    },
  });

  if (!subscription) {
    throw new Error(`Subscription ${subscriptionId} not found`);
  }

  // Idempotency check — do not double-bill
  const existing = await prisma.invoice.findFirst({
    where: {
      subscriptionId,
      billingPeriodStart: new Date(billingPeriodStart),
      billingPeriodEnd: new Date(billingPeriodEnd),
      deletedAt: null,
    },
  });

  if (existing) {
    return { invoice: existing, created: false };
  }

  // Fetch default tax if any
  const defaultTax = await prisma.tax.findFirst({ where: { isDefault: true, isActive: true, deletedAt: null } });

  let subtotal = 0;
  let taxTotal = 0;
  const invoiceLines = subscription.lines.map((line) => {
    const unitNet = Number(line.unitPrice) + Number(line.additionalPrice);
    const lineSubtotal = Math.round(unitNet * line.quantity * 100) / 100;
    subtotal += lineSubtotal;

    let taxAmount = 0;
    let taxRateSnapshot = 0;
    if (defaultTax) {
      if (defaultTax.type === 'PERCENTAGE') {
        taxRateSnapshot = Number(defaultTax.rate);
        taxAmount = Math.round(lineSubtotal * taxRateSnapshot * 100) / 100;
      } else {
        taxRateSnapshot = 0;
        taxAmount = Number(defaultTax.rate); // fixed amount per line
      }
      taxTotal += taxAmount;
    }

    return {
      productId: line.productId,
      variantId: line.variantId,
      taxId: defaultTax?.id || null,
      productName: line.product.name,
      variantName: line.variant?.name || null,
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      additionalPrice: line.additionalPrice,
      subtotal: lineSubtotal,
      taxRateSnapshot,
      taxAmount,
      discountAmount: 0,
      total: Math.round((lineSubtotal + taxAmount) * 100) / 100,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  taxTotal = Math.round(taxTotal * 100) / 100;
  const grandTotal = Math.round((subtotal + taxTotal) * 100) / 100;

  // Due date: 30 days from period end by default
  const dueDate = new Date(billingPeriodEnd);
  dueDate.setDate(dueDate.getDate() + 30);

  const invoiceNumber = await generateInvoiceNumber();

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        subscriptionId,
        customerId: subscription.customerId,
        createdById,
        billingPeriodStart: new Date(billingPeriodStart),
        billingPeriodEnd: new Date(billingPeriodEnd),
        issueDate: new Date(),
        dueDate,
        status: 'POSTED',
        subtotal,
        taxTotal,
        discountTotal: 0,
        grandTotal,
        amountPaid: 0,
        amountDue: grandTotal,
      },
    });

    await tx.invoiceLine.createMany({
      data: invoiceLines.map((l) => ({ ...l, invoiceId: created.id })),
    });

    return tx.invoice.findUnique({ where: { id: created.id }, include: INVOICE_INCLUDE });
  });

  return { invoice, created: true };
}

export async function createManualInvoice(data, currentUserId, ipAddress, userAgent) {
  const { subscriptionId, billingPeriodStart, billingPeriodEnd, dueDate, notes } = data;

  const { invoice, created } = await generateInvoiceForSubscription(
    subscriptionId,
    billingPeriodStart,
    billingPeriodEnd,
    currentUserId
  );

  if (!created) {
    const err = new Error('An invoice for this billing period already exists');
    err.statusCode = 409;
    err.code = 'INVOICE_EXISTS';
    throw err;
  }

  // Override notes and dueDate if provided
  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      notes: notes || undefined,
      dueDate: new Date(dueDate),
    },
    include: INVOICE_INCLUDE,
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Invoice',
    entityId: invoice.id,
    newValues: { invoiceNumber: invoice.invoiceNumber, subscriptionId },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function getInvoiceById(id, currentUser) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, deletedAt: null },
    include: INVOICE_INCLUDE,
  });

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (currentUser?.role === 'CUSTOMER' && currentUser.customer?.id !== invoice.customerId) {
    const err = new Error('Access forbidden');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return invoice;
}

export async function postInvoice(id, currentUser, ipAddress, userAgent) {
  const invoice = await getInvoiceById(id, currentUser);

  if (invoice.status !== 'DRAFT') {
    const err = new Error(`Invoice is already in status: ${invoice.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'POSTED' },
    include: INVOICE_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'POST',
    entity: 'Invoice',
    entityId: id,
    oldValues: { status: 'DRAFT' },
    newValues: { status: 'POSTED' },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function voidInvoice(id, reason, currentUser, ipAddress, userAgent) {
  const invoice = await getInvoiceById(id, currentUser);

  if (['PAID', 'VOID', 'CANCELLED'].includes(invoice.status)) {
    const err = new Error(`Cannot void an invoice in status: ${invoice.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: 'VOID',
      notes: reason ? `${invoice.notes || ''}\nVoided: ${reason}`.trim() : invoice.notes,
    },
    include: INVOICE_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'VOID',
    entity: 'Invoice',
    entityId: id,
    oldValues: { status: invoice.status },
    newValues: { status: 'VOID', reason },
    ipAddress,
    userAgent,
  });

  return updated;
}

/**
 * Mark overdue invoices. Called by the billing worker on a schedule.
 */
export async function markOverdueInvoices() {
  const now = new Date();
  const result = await prisma.invoice.updateMany({
    where: {
      status: 'POSTED',
      dueDate: { lt: now },
      deletedAt: null,
    },
    data: { status: 'OVERDUE' },
  });
  return result.count;
}
