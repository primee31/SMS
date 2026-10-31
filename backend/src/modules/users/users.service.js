import bcrypt from 'bcryptjs';
import { prisma } from '../../config/prisma.js';
import { logAudit } from '../audit/audit.service.js';

export async function listUsers(query) {
  const { page, limit, search, role, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const where = {
    deletedAt: null,
    ...(role && { role }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: { id: true, name: true, company: true }
        }
      }
    })
  ]);

  return {
    items: users,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}

export async function createStaff(data, currentUserId, ipAddress = null, userAgent = null) {
  const { email, password, firstName, lastName } = data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existing) {
    const error = new Error('A user with this email already exists');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const staff = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: 'STAFF',
      isActive: true
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'CREATE_STAFF',
    entity: 'User',
    entityId: staff.id,
    newValues: { email: staff.email, role: staff.role },
    ipAddress,
    userAgent
  });

  return staff;
}

export async function getUserById(id) {
  const user = await prisma.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      customer: true
    }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  return user;
}

export async function updateUser(id, data, currentUserId, ipAddress = null, userAgent = null) {
  const existing = await getUserById(id);

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.firstName && { firstName: data.firstName }),
      ...(data.lastName && { lastName: data.lastName }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.role && { role: data.role })
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      updatedAt: true
    }
  });

  await logAudit({
    userId: currentUserId,
    action: 'UPDATE',
    entity: 'User',
    entityId: id,
    oldValues: { firstName: existing.firstName, lastName: existing.lastName, role: existing.role, isActive: existing.isActive },
    newValues: data,
    ipAddress,
    userAgent
  });

  return updated;
}

export async function deleteUser(id, currentUserId, ipAddress = null, userAgent = null) {
  await getUserById(id);

  const deleted = await prisma.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      isActive: false
    }
  });

  // Revoke all refresh tokens
  await prisma.refreshToken.updateMany({
    where: { userId: id },
    data: { revokedAt: new Date() }
  });

  await logAudit({
    userId: currentUserId,
    action: 'SOFT_DELETE',
    entity: 'User',
    entityId: id,
    ipAddress,
    userAgent
  });

  return { success: true, message: 'User deleted successfully' };
}
