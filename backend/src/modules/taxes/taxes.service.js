import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listTaxes(query) {
  const { page, limit, isActive, search } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, items] = await Promise.all([
    prisma.tax.count({ where }),
    prisma.tax.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { items, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createTax(data, currentUserId, ipAddress, userAgent) {
  const existing = await prisma.tax.findUnique({ where: { code: data.code } });
  if (existing) {
    const err = new Error('A tax with this code already exists');
    err.statusCode = 409;
    err.code = 'TAX_CODE_EXISTS';
    throw err;
  }

  // If marking as default, unset all others
  if (data.isDefault) {
    await prisma.tax.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
  }

  const tax = await prisma.tax.create({ data });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Tax',
    entityId: tax.id,
    newValues: { name: tax.name, code: tax.code, rate: tax.rate },
    ipAddress,
    userAgent,
  });

  return tax;
}

export async function getTaxById(id) {
  const tax = await prisma.tax.findFirst({ where: { id, deletedAt: null } });
  if (!tax) {
    const err = new Error('Tax not found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return tax;
}

export async function updateTax(id, data, currentUserId, ipAddress, userAgent) {
  const existing = await getTaxById(id);

  if (data.code && data.code !== existing.code) {
    const dup = await prisma.tax.findUnique({ where: { code: data.code } });
    if (dup && dup.id !== id) {
      const err = new Error('A tax with this code already exists');
      err.statusCode = 409;
      err.code = 'TAX_CODE_EXISTS';
      throw err;
    }
  }

  if (data.isDefault) {
    await prisma.tax.updateMany({ where: { isDefault: true, id: { not: id } }, data: { isDefault: false } });
  }

  const updated = await prisma.tax.update({ where: { id }, data });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'Tax',
    entityId: id,
    oldValues: { name: existing.name, rate: existing.rate },
    newValues: data,
    ipAddress,
    userAgent,
  });

  return updated;
}

export async function deleteTax(id, currentUserId, ipAddress, userAgent) {
  await getTaxById(id);

  await prisma.tax.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'Tax',
    entityId: id,
    ipAddress,
    userAgent,
  });

  return { success: true, message: 'Tax deleted successfully' };
}
