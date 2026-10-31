import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';
import { computePeriodEnd } from '../quotations/quotations.service.js';

async function generateSubscriptionNumber() {
  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;
  const last = await prisma.subscription.findFirst({
    where: { subscriptionNumber: { startsWith: prefix } },
    orderBy: { subscriptionNumber: 'desc' },
    select: { subscriptionNumber: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.subscriptionNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

function computeLineSubtotal(line) {
  const unitNet = Number(line.unitPrice) + Number(line.additionalPrice || 0);
  return Math.round(unitNet * line.quantity * 100) / 100;
}

const SUBSCRIPTION_INCLUDE = {
  customer: { select: { id: true, name: true, email: true, company: true } },
  plan: { select: { id: true, name: true, code: true, billingFrequency: true, price: true } },
  quotation: { select: { id: true, quotationNumber: true } },
  lines: {
    include: {
      product: { select: { id: true, name: true, type: true } },
      variant: { select: { id: true, name: true } },
    },
  },
  invoices: {
    where: { deletedAt: null },
    orderBy: { issueDate: 'desc' },
    take: 5,
    select: { id: true, invoiceNumber: true, status: true, grandTotal: true, issueDate: true, dueDate: true },
  },
  _count: { select: { invoices: true } },
};

export async function listSubscriptions(query, currentUser) {
  const { page, limit, search, status, customerId, planId, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(planId && { planId }),
    ...(currentUser.role === 'CUSTOMER' && currentUser.customer
      ? { customerId: currentUser.customer.id }
      : customerId && { customerId }),
    ...(search && {
      OR: [
        { subscriptionNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: { select: { id: true, name: true, code: true } },
        _count: { select: { invoices: true } },
      },
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createSubscription(data, currentUserId, ipAddress, userAgent) {
  const { lines, ...subData } = data;

  // Validate customer and plan
  const [customer, plan] = await Promise.all([
    prisma.customer.findFirst({ where: { id: data.customerId, deletedAt: null } }),
    prisma.plan.findFirst({ where: { id: data.planId, deletedAt: null, isActive: true } }),
  ]);

  if (!customer) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (!plan) {
    const err = new Error('Plan not found or inactive');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const startDate = subData.startDate ? new Date(subData.startDate) : new Date();
  const billingFrequency = subData.billingFrequency || plan.billingFrequency;
  const periodEnd = computePeriodEnd(startDate, billingFrequency);
  const nextBillingDate = new Date(periodEnd);
  nextBillingDate.setDate(nextBillingDate.getDate() + 1);

  const computedLines = lines.map((l) => ({ ...l, subtotal: computeLineSubtotal(l) }));
  const recurringTotal = computedLines.reduce((sum, l) => sum + l.subtotal, 0);
  const subscriptionNumber = await generateSubscriptionNumber();

  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        subscriptionNumber,
        customerId: subData.customerId,
        planId: subData.planId,
        quotationId: subData.quotationId || null,
        status: 'ACTIVE',
        billingFrequency,
        startDate,
        currentPeriodStart: startDate,
        currentPeriodEnd: periodEnd,
        nextBillingDate,
        basePrice: plan.price,
        recurringTotal,
        autoRenew: subData.autoRenew ?? true,
        notes: subData.notes,
      },
    });

    await tx.subscriptionLine.createMany({
      data: computedLines.map((l) => ({
        subscriptionId: sub.id,
        productId: l.productId,
        variantId: l.variantId || null,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        additionalPrice: l.additionalPrice || 0,
        subtotal: l.subtotal,
      })),
    });

    return tx.subscription.findUnique({ where: { id: sub.id }, include: SUBSCRIPTION_INCLUDE });
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Subscription',
    entityId: subscription.id,
    newValues: { subscriptionNumber, customerId: data.customerId, planId: data.planId },
    ipAddress,
    userAgent,
  });

  return subscription;
}

export async function getSubscriptionById(id, currentUser) {
  const subscription = await prisma.subscription.findFirst({
    where: { id, deletedAt: null },
    include: SUBSCRIPTION_INCLUDE,
  });

  if (!subscription) {
    const err = new Error('Subscription not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (currentUser?.role === 'CUSTOMER' && currentUser.customer?.id !== subscription.customerId) {
    const err = new Error('Access forbidden');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return subscription;
}

export async function updateSubscription(id, data, currentUser, ipAddress, userAgent) {
  const existing = await getSubscriptionById(id, currentUser);

  if (['CANCELLED', 'CLOSED', 'EXPIRED'].includes(existing.status)) {
    const err = new Error(`Cannot edit a subscription in status: ${existing.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const { lines, ...subData } = data;
  let computedLines = [];
  let recurringTotal = Number(existing.recurringTotal);

  if (lines && lines.length > 0) {
    computedLines = lines.map((l) => ({ ...l, subtotal: computeLineSubtotal(l) }));
    recurringTotal = computedLines.reduce((sum, l) => sum + l.subtotal, 0);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id },
      data: { ...subData, recurringTotal },
    });

    if (computedLines.length > 0) {
      await tx.subscriptionLine.deleteMany({ where: { subscriptionId: id } });
      await tx.subscriptionLine.createMany({
        data: computedLines.map((l) => ({
          subscriptionId: id,
          productId: l.productId,
          variantId: l.variantId || null,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          additionalPrice: l.additionalPrice || 0,
          subtotal: l.subtotal,
        })),
      });
    }

    return tx.subscription.findUnique({ where: { id }, include: SUBSCRIPTION_INCLUDE });
  });

  await logAudit({
    userId: currentUser.id,
    action: 'UPDATE',
    entity: 'Subscription',
    entityId: id,
    oldValues: { status: existing.status, recurringTotal: existing.recurringTotal },
    newValues: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function cancelSubscription(id, reason, currentUser, ipAddress, userAgent) {
  const existing = await getSubscriptionById(id, currentUser);

  if (['CANCELLED', 'CLOSED', 'EXPIRED'].includes(existing.status)) {
    const err = new Error(`Subscription is already ${existing.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      notes: reason ? `${existing.notes || ''}\nCancelled: ${reason}`.trim() : existing.notes,
    },
    include: SUBSCRIPTION_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'CANCEL',
    entity: 'Subscription',
    entityId: id,
    oldValues: { status: existing.status },
    newValues: { status: 'CANCELLED', reason },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function pauseSubscription(id, currentUser, ipAddress, userAgent) {
  const existing = await getSubscriptionById(id, currentUser);

  if (existing.status !== 'ACTIVE') {
    const err = new Error('Only active subscriptions can be paused');
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  // Check plan allows pause
  if (!existing.plan?.pauseAllowed) {
    const err = new Error('This plan does not allow pausing');
    err.statusCode = 400;
    err.code = 'PAUSE_NOT_ALLOWED';
    throw err;
  }

  const updated = await prisma.subscription.update({
    where: { id },
    data: { status: 'PAUSED', pausedAt: new Date() },
    include: SUBSCRIPTION_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'PAUSE',
    entity: 'Subscription',
    entityId: id,
    oldValues: { status: 'ACTIVE' },
    newValues: { status: 'PAUSED' },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function resumeSubscription(id, currentUser, ipAddress, userAgent) {
  const existing = await getSubscriptionById(id, currentUser);

  if (existing.status !== 'PAUSED') {
    const err = new Error('Only paused subscriptions can be resumed');
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const now = new Date();
  const periodEnd = computePeriodEnd(now, existing.billingFrequency);
  const nextBillingDate = new Date(periodEnd);
  nextBillingDate.setDate(nextBillingDate.getDate() + 1);

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      resumedAt: now,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingDate,
    },
    include: SUBSCRIPTION_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'RESUME',
    entity: 'Subscription',
    entityId: id,
    oldValues: { status: 'PAUSED' },
    newValues: { status: 'ACTIVE' },
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function renewSubscription(id, currentUser, ipAddress, userAgent) {
  const existing = await getSubscriptionById(id, currentUser);

  if (!['ACTIVE', 'EXPIRED'].includes(existing.status)) {
    const err = new Error('Only active or expired subscriptions can be renewed');
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const now = new Date();
  const periodEnd = computePeriodEnd(now, existing.billingFrequency);
  const nextBillingDate = new Date(periodEnd);
  nextBillingDate.setDate(nextBillingDate.getDate() + 1);

  const updated = await prisma.subscription.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      nextBillingDate,
    },
    include: SUBSCRIPTION_INCLUDE,
  });

  await logAudit({
    userId: currentUser.id,
    action: 'RENEW',
    entity: 'Subscription',
    entityId: id,
    ipAddress,
    userAgent,
  });

  return updated;
}
