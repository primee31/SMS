import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listDiscounts(query) {
  const { page, limit, isActive, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.discount.count({ where }),
    prisma.discount.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { usages: true } } },
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createDiscount(data, currentUserId, ipAddress, userAgent) {
  const existing = await prisma.discount.findUnique({ where: { code: data.code } });
  if (existing) {
    const err = new Error('A discount with this code already exists');
    err.statusCode = 409;
    err.code = 'DISCOUNT_CODE_EXISTS';
    throw err;
  }

  const discount = await prisma.discount.create({
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Discount',
    entityId: discount.id,
    newValues: { code: discount.code, type: discount.type, value: discount.value },
    ipAddress,
    userAgent,
  });

  return discount;
}

export async function getDiscountById(id) {
  const discount = await prisma.discount.findFirst({
    where: { id, deletedAt: null },
    include: { usages: { include: { customer: { select: { id: true, name: true } } }, orderBy: { usedAt: 'desc' }, take: 10 } },
  });
  if (!discount) {
    const err = new Error('Discount not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return discount;
}

export async function validateDiscount(code, orderAmount = 0) {
  const discount = await prisma.discount.findFirst({
    where: { code: code.toUpperCase(), deletedAt: null, isActive: true },
  });

  if (!discount) {
    const err = new Error('Invalid or inactive discount code');
    err.statusCode = 400;
    err.code = 'INVALID_DISCOUNT';
    throw err;
  }

  const now = new Date();
  if (discount.startDate && discount.startDate > now) {
    const err = new Error('Discount is not yet active');
    err.statusCode = 400;
    err.code = 'DISCOUNT_NOT_ACTIVE';
    throw err;
  }
  if (discount.endDate && discount.endDate < now) {
    const err = new Error('Discount has expired');
    err.statusCode = 400;
    err.code = 'DISCOUNT_EXPIRED';
    throw err;
  }
  if (discount.maxUses !== null && discount.usedCount >= discount.maxUses) {
    const err = new Error('Discount usage limit reached');
    err.statusCode = 400;
    err.code = 'DISCOUNT_LIMIT_REACHED';
    throw err;
  }
  if (discount.minOrderAmount !== null && Number(orderAmount) < Number(discount.minOrderAmount)) {
    const err = new Error(`Minimum order amount of ${discount.minOrderAmount} required`);
    err.statusCode = 400;
    err.code = 'DISCOUNT_MIN_AMOUNT';
    throw err;
  }

  // Calculate discount amount
  let discountAmount = 0;
  if (discount.type === 'PERCENTAGE') {
    discountAmount = (Number(orderAmount) * Number(discount.value)) / 100;
  } else {
    discountAmount = Math.min(Number(discount.value), Number(orderAmount));
  }

  return { discount, discountAmount: Math.round(discountAmount * 100) / 100 };
}

export async function updateDiscount(id, data, currentUserId, ipAddress, userAgent) {
  const existing = await getDiscountById(id);

  if (data.code && data.code !== existing.code) {
    const dup = await prisma.discount.findUnique({ where: { code: data.code } });
    if (dup && dup.id !== id) {
      const err = new Error('A discount with this code already exists');
      err.statusCode = 409;
      err.code = 'DISCOUNT_CODE_EXISTS';
      throw err;
    }
  }

  const updated = await prisma.discount.update({
    where: { id },
    data: {
      ...data,
      ...(data.startDate !== undefined && { startDate: data.startDate ? new Date(data.startDate) : null }),
      ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
    },
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'Discount',
    entityId: id,
    oldValues: { code: existing.code, value: existing.value },
    newValues: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function deleteDiscount(id, currentUserId, ipAddress, userAgent) {
  await getDiscountById(id);
  await prisma.discount.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'Discount',
    entityId: id,
    ipAddress,
    userAgent,
  });

  return { success: true, message: 'Discount deleted successfully' };
}
