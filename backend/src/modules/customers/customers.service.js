import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listCustomers(query) {
  const { page, limit, search, status, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true }
        },
        _count: {
          select: { subscriptions: true, invoices: true, quotations: true }
        }
      }
    })
  ]);

  return {
    items: customers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createCustomer(data, currentUserId, ipAddress = null, userAgent = null) {
  const existing = await prisma.customer.findUnique({
    where: { email: data.email.toLowerCase() }
  });

  if (existing) {
    const error = new Error('A customer with this email already exists');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const customer = await prisma.customer.create({
    data: {
      ...data,
      email: data.email.toLowerCase()
    },
    include: {
      user: {
        select: { id: true, email: true, role: true }
      }
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Customer',
    entityId: customer.id,
    newValues: { name: customer.name, email: customer.email },
    ipAddress,
    userAgent
  });

  return customer;
}

export async function getCustomerById(id) {
  const customer = await prisma.customer.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: {
        select: { id: true, email: true, role: true, isActive: true }
      },
      subscriptions: {
        where: { deletedAt: null },
        include: { plan: true }
      },
      invoices: {
        where: { deletedAt: null },
        orderBy: { issueDate: 'desc' },
        take: 5
      },
      _count: {
        select: { subscriptions: true, invoices: true, quotations: true }
      }
    }
  });

  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return customer;
}

export async function updateCustomer(id, data, currentUserId, ipAddress = null, userAgent = null) {
  const existing = await getCustomerById(id);

  if (data.email && data.email.toLowerCase() !== existing.email.toLowerCase()) {
    const duplicate = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase() }
    });
    if (duplicate && duplicate.id !== id) {
      const error = new Error('A customer with this email already exists');
      error.statusCode = 409;
      error.code = 'EMAIL_ALREADY_EXISTS';
      throw error;
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...data,
      ...(data.email && { email: data.email.toLowerCase() })
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'Customer',
    entityId: id,
    oldValues: { name: existing.name, email: existing.email, status: existing.status },
    newValues: data,
    ipAddress,
    userAgent
  });

  return updated;
}

export async function deleteCustomer(id, currentUserId, ipAddress = null, userAgent = null) {
  await getCustomerById(id);

  const deleted = await prisma.customer.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      status: 'ARCHIVED'
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'Customer',
    entityId: id,
    ipAddress,
    userAgent
  });

  return { success: true, message: 'Customer archived successfully' };
}
