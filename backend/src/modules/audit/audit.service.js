import { prisma } from '../../config/prisma.js';

export async function logAudit({
  userId = null,
  action,
  entity,
  entityId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent
      }
    });
  } catch (error) {
    // Non-blocking error logging for audits
    console.error('Failed to write audit log:', error);
    return null;
  }
}
