import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

async function generatePaymentNumber() {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;
  const last = await prisma.payment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });
  let seq = 1;
  if (last) {
    const parts = last.paymentNumber.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

const PAYMENT_INCLUDE = {
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      grandTotal: true,
      amountDue: true,
    },
  },
  customer: { select: { id: true, name: true, email: true } },
};

export async function listPayments(query, currentUser) {
  const { page, limit, invoiceId, customerId, status, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(invoiceId && { invoiceId }),
    ...(currentUser.role === 'CUSTOMER' && currentUser.customer
      ? { customerId: currentUser.customer.id }
      : customerId && { customerId }),
  };

  const [total, items] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: PAYMENT_INCLUDE,
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createPayment(data, currentUserId, ipAddress, userAgent) {
  const { invoiceId, amount, currency, paymentMethod, transactionReference, notes, paidAt } = data;

  // Load invoice to check it exists and get customer
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, deletedAt: null },
  });

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (['VOID', 'CANCELLED'].includes(invoice.status)) {
    const err = new Error(`Cannot record payment for a ${invoice.status} invoice`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const amountNum = Number(amount);
  const amountDue = Number(invoice.amountDue);

  if (amountNum > amountDue) {
    const err = new Error(`Payment amount (${amountNum}) exceeds amount due (${amountDue})`);
    err.statusCode = 400;
    err.code = 'OVERPAYMENT';
    throw err;
  }

  const paymentNumber = await generatePaymentNumber();

  const payment = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.create({
      data: {
        paymentNumber,
        invoiceId,
        customerId: invoice.customerId,
        amount: amountNum,
        currency,
        paymentMethod,
        status: 'COMPLETED',
        transactionReference,
        notes,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
      },
      include: PAYMENT_INCLUDE,
    });

    // Update invoice paid amounts
    const newAmountPaid = Math.round((Number(invoice.amountPaid) + amountNum) * 100) / 100;
    const newAmountDue = Math.max(0, Math.round((amountDue - amountNum) * 100) / 100);

    let newStatus = invoice.status;
    if (newAmountDue <= 0) {
      newStatus = 'PAID';
    } else if (newAmountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus },
    });

    return pay;
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Payment',
    entityId: payment.id,
    newValues: { paymentNumber, invoiceId, amount, paymentMethod },
    ipAddress,
    userAgent,
  });

  return payment;
}

export async function getPaymentById(id, currentUser) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: PAYMENT_INCLUDE,
  });

  if (!payment) {
    const err = new Error('Payment not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (currentUser?.role === 'CUSTOMER' && currentUser.customer?.id !== payment.customerId) {
    const err = new Error('Access forbidden');
    err.statusCode = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  return payment;
}

export async function refundPayment(id, reason, currentUser, ipAddress, userAgent) {
  const payment = await getPaymentById(id, currentUser);

  if (payment.status !== 'COMPLETED') {
    const err = new Error(`Cannot refund a payment in status: ${payment.status}`);
    err.statusCode = 400;
    err.code = 'INVALID_STATUS';
    throw err;
  }

  const amountNum = Number(payment.amount);

  await prisma.$transaction(async (tx) => {
    // Mark payment as refunded
    await tx.payment.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        notes: reason ? `${payment.notes || ''}\nRefunded: ${reason}`.trim() : payment.notes,
      },
    });

    // Revert invoice paid amount
    const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
    const newAmountPaid = Math.max(0, Math.round((Number(invoice.amountPaid) - amountNum) * 100) / 100);
    const newAmountDue = Math.round((Number(invoice.grandTotal) - newAmountPaid) * 100) / 100;

    let newStatus = 'POSTED';
    if (newAmountPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: { amountPaid: newAmountPaid, amountDue: newAmountDue, status: newStatus },
    });
  });

  await logAudit({
    userId: currentUser.id,
    action: 'REFUND',
    entity: 'Payment',
    entityId: id,
    oldValues: { status: 'COMPLETED', amount: payment.amount },
    newValues: { status: 'REFUNDED', reason },
    ipAddress,
    userAgent,
  });

  return getPaymentById(id, currentUser);
}
