import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { logAudit } from '../audit/audit.service.js';

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );
}

function generateRefreshTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

export async function registerCustomer(data, ipAddress = null, userAgent = null) {
  const { email, password, firstName, lastName, company, phone } = data;

  // 1. Verify email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    const error = new Error('An account with this email address already exists');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Create User with guaranteed role CUSTOMER and create linked Customer record
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: 'CUSTOMER', // Strict: Never accept customer-supplied role
        isActive: true
      }
    });

    const customer = await tx.customer.create({
      data: {
        userId: user.id,
        name: `${firstName} ${lastName}`.trim(),
        email: email.toLowerCase(),
        phone: phone || null,
        company: company || null,
        status: 'ACTIVE'
      }
    });

    // Generate refresh token
    const rawRefreshToken = generateRefreshTokenString();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    return { user, customer, rawRefreshToken };
  });

  const accessToken = generateAccessToken(result.user);

  await logAudit({
    userId: result.user.id,
    action: 'REGISTER',
    entity: 'User',
    entityId: result.user.id,
    newValues: { email: result.user.email, role: result.user.role },
    ipAddress,
    userAgent
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      customer: result.customer
    },
    accessToken,
    refreshToken: result.rawRefreshToken
  };
}

export async function loginUser({ email, password }, ipAddress = null, userAgent = null) {
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      deletedAt: null
    },
    include: {
      customer: true
    }
  });

  if (!user || !user.isActive) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    error.code = 'INVALID_CREDENTIALS';
    throw error;
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const rawRefreshToken = generateRefreshTokenString();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  await logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'User',
    entityId: user.id,
    ipAddress,
    userAgent
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      customer: user.customer
    },
    accessToken,
    refreshToken: rawRefreshToken
  };
}

export async function rotateRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) {
    const error = new Error('Refresh token is required');
    error.statusCode = 401;
    error.code = 'TOKEN_REQUIRED';
    throw error;
  }

  const tokenHash = hashToken(rawRefreshToken);

  const existingToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { customer: true } } }
  });

  if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
    // Potential token reuse detected - revoke all tokens if reused
    if (existingToken && existingToken.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: existingToken.userId },
        data: { revokedAt: new Date() }
      });
    }
    const error = new Error('Invalid, expired, or revoked refresh token');
    error.statusCode = 401;
    error.code = 'INVALID_REFRESH_TOKEN';
    throw error;
  }

  if (!existingToken.user.isActive || existingToken.user.deletedAt) {
    const error = new Error('User account is deactivated');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  // Token rotation: Revoke current token and generate new one
  const newRawRefreshToken = generateRefreshTokenString();
  const newTokenHash = hashToken(newRawRefreshToken);
  const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: {
        revokedAt: new Date(),
        replacedByToken: newTokenHash
      }
    }),
    prisma.refreshToken.create({
      data: {
        userId: existingToken.userId,
        tokenHash: newTokenHash,
        expiresAt: newExpiresAt
      }
    })
  ]);

  const newAccessToken = generateAccessToken(existingToken.user);

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken
  };
}

export async function logoutUser(rawRefreshToken, userId = null) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() }
    });
  }

  if (userId) {
    await logAudit({
      userId,
      action: 'LOGOUT',
      entity: 'User',
      entityId: userId
    });
  }

  return { success: true };
}

export async function requestPasswordReset(email) {
  const user = await prisma.user.findFirst({
    where: {
      email: email.toLowerCase(),
      isActive: true,
      deletedAt: null
    }
  });

  if (!user) {
    // Return generic message to prevent email enumeration
    return {
      success: true,
      message: 'If an account exists with this email, a reset link has been generated.'
    };
  }

  // Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

  // Invalidate any previous unused reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      usedAt: null
    }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  await logAudit({
    userId: user.id,
    action: 'FORGOT_PASSWORD_REQUEST',
    entity: 'User',
    entityId: user.id
  });

  // Local development workflow: Return dev token so testing / frontend flow can complete without email service
  return {
    success: true,
    message: 'If an account exists with this email, a reset link has been generated.',
    devResetToken: rawToken
  };
}

export async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true }
  });

  if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
    const error = new Error('Invalid, expired, or already used password reset token');
    error.statusCode = 400;
    error.code = 'INVALID_RESET_TOKEN';
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    }),
    // Invalidate all active sessions for security
    prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { revokedAt: new Date() }
    })
  ]);

  await logAudit({
    userId: resetRecord.userId,
    action: 'PASSWORD_RESET',
    entity: 'User',
    entityId: resetRecord.userId
  });

  return {
    success: true,
    message: 'Password has been reset successfully. You can now log in.'
  };
}

export async function getCurrentUserProfile(userId) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null
    },
    include: {
      customer: true
    }
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    customer: user.customer
  };
}
