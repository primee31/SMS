import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listPlans(query) {
  const { page, limit, search, billingFrequency, isActive, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(billingFrequency && { billingFrequency }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [total, plans] = await Promise.all([
    prisma.plan.count({ where }),
    prisma.plan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        planProducts: {
          include: {
            product: {
              include: { variants: true }
            }
          }
        },
        _count: {
          select: { subscriptions: true }
        }
      }
    })
  ]);

  return {
    items: plans,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createPlan(data, currentUserId, ipAddress = null, userAgent = null) {
  const { productIds, ...planData } = data;

  const existing = await prisma.plan.findUnique({
    where: { code: planData.code.toUpperCase() }
  });

  if (existing) {
    const error = new Error('A plan with this code already exists');
    error.statusCode = 409;
    error.code = 'PLAN_CODE_EXISTS';
    throw error;
  }

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.plan.create({
      data: {
        ...planData,
        code: planData.code.toUpperCase(),
        availableFrom: planData.availableFrom ? new Date(planData.availableFrom) : null,
        availableUntil: planData.availableUntil ? new Date(planData.availableUntil) : null
      }
    });

    if (productIds && productIds.length > 0) {
      await tx.planProduct.createMany({
        data: productIds.map((productId) => ({
          planId: created.id,
          productId,
          quantity: 1,
          isMandatory: true
        }))
      });
    }

    const reloaded = await tx.plan.findUnique({
      where: { id: created.id },
      include: {
        planProducts: {
          include: { product: true }
        }
      }
    });
    return reloaded || created;
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE',
    entity: 'Plan',
    entityId: plan.id,
    newValues: { name: plan.name, code: plan.code, price: plan.price },
    ipAddress,
    userAgent
  });

  return plan;
}

export async function getPlanById(id) {
  const plan = await prisma.plan.findFirst({
    where: { id, deletedAt: null },
    include: {
      planProducts: {
        include: {
          product: {
            include: { variants: true }
          }
        }
      },
      _count: {
        select: { subscriptions: true, quotations: true }
      }
    }
  });

  if (!plan) {
    const error = new Error('Plan not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return plan;
}

export async function updatePlan(id, data, currentUserId, ipAddress = null, userAgent = null) {
  const existing = await getPlanById(id);

  if (data.code && data.code.toUpperCase() !== existing.code) {
    const duplicate = await prisma.plan.findUnique({
      where: { code: data.code.toUpperCase() }
    });
    if (duplicate && duplicate.id !== id) {
      const error = new Error('A plan with this code already exists');
      error.statusCode = 409;
      error.code = 'PLAN_CODE_EXISTS';
      throw error;
    }
  }

  const updated = await prisma.plan.update({
    where: { id },
    data: {
      ...data,
      ...(data.code && { code: data.code.toUpperCase() }),
      ...(data.availableFrom !== undefined && {
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null
      }),
      ...(data.availableUntil !== undefined && {
        availableUntil: data.availableUntil ? new Date(data.availableUntil) : null
      })
    },
    include: {
      planProducts: {
        include: { product: true }
      }
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'Plan',
    entityId: id,
    oldValues: { name: existing.name, code: existing.code, price: existing.price },
    newValues: data,
    ipAddress,
    userAgent
  });

  return updated;
}

export async function deletePlan(id, currentUserId, ipAddress = null, userAgent = null) {
  await getPlanById(id);

  await prisma.plan.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'Plan',
    entityId: id,
    ipAddress,
    userAgent
  });

  return { success: true, message: 'Plan deleted successfully' };
}
