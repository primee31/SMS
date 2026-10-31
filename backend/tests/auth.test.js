import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';

vi.mock('../src/config/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      customer: {
        findUnique: vi.fn(),
        create: vi.fn()
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      passwordResetToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      },
      $transaction: vi.fn(async (cb) => {
        if (Array.isArray(cb)) {
          return await Promise.all(cb);
        }
        return await cb(prisma);
      })
    }
  };
});

describe('Authentication & Security Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Self-Registration', () => {
    it('should successfully register a customer and enforce CUSTOMER role', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) => ({
        id: 'user-uuid-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      prisma.customer.create.mockImplementation(({ data }) => ({
        id: 'cust-uuid-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password#2026',
          firstName: 'John',
          lastName: 'Doe',
          company: 'Acme Test',
          phone: '+1234567890',
          role: 'ADMIN' // Malicious attempt to self-escalate
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('newuser@example.com');
      // Crucial security requirement: role must be CUSTOMER, ignoring any user-supplied role
      expect(response.body.data.user.role).toBe('CUSTOMER');
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should reject registration if email is already in use', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'taken@example.com' });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'taken@example.com',
          password: 'Password#2026',
          firstName: 'Jane',
          lastName: 'Doe'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should enforce strong password rules (min 9 chars, uppercase, lowercase, special char)', async () => {
      // 1. Too short (<= 8 chars)
      const resShort = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Pass#12', // 7 chars
          firstName: 'A',
          lastName: 'B'
        });
      expect(resShort.status).toBe(400);

      // 2. Missing uppercase
      const resNoUpper = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password#2026',
          firstName: 'A',
          lastName: 'B'
        });
      expect(resNoUpper.status).toBe(400);

      // 3. Missing lowercase
      const resNoLower = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'PASSWORD#2026',
          firstName: 'A',
          lastName: 'B'
        });
      expect(resNoLower.status).toBe(400);

      // 4. Missing special character
      const resNoSpecial = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password2026',
          firstName: 'A',
          lastName: 'B'
        });
      expect(resNoSpecial.status).toBe(400);
    });
  });

  describe('Login & Password Verification', () => {
    it('should successfully authenticate user with correct credentials and hash verification', async () => {
      const realPassword = 'Secure#Password123';
      const passwordHash = await bcrypt.hash(realPassword, 10);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        passwordHash,
        firstName: 'Alice',
        lastName: 'Smith',
        role: 'CUSTOMER',
        isActive: true,
        customer: { id: 'cust-1', name: 'Alice Smith' }
      });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: realPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('user@example.com');
      expect(response.body.data.accessToken).toBeDefined();

      // Check HTTP-only cookie set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('refreshToken='))).toBe(true);
    });

    it('should reject login with incorrect password', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword#1', 10);

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'user@example.com',
        passwordHash,
        isActive: true
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword#999'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Refresh Token Rotation & Revocation', () => {
    it('should rotate refresh token and issue new access token', async () => {
      const oldRefreshToken = 'a'.repeat(80);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-uuid-1',
        userId: 'user-uuid-1',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        user: {
          id: 'user-uuid-1',
          email: 'user@example.com',
          role: 'CUSTOMER',
          isActive: true
        }
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should revoke token and clear cookie on logout', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', ['refreshToken=valid-token']);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Password Reset Expiry & Prevention of Reuse', () => {
    it('should reject reset when token is expired or already used', async () => {
      // 1. Expired token
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-id-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
        usedAt: null
      });

      const expiredRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'expired-token-val',
          newPassword: 'NewPassword#2026'
        });

      expect(expiredRes.status).toBe(400);
      expect(expiredRes.body.error.code).toBe('INVALID_RESET_TOKEN');

      // 2. Already used token
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-id-2',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 10000),
        usedAt: new Date(Date.now() - 1000) // Already used
      });

      const reusedRes = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'used-token-val',
          newPassword: 'NewPassword#2026'
        });

      expect(reusedRes.status).toBe(400);
      expect(reusedRes.body.error.code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
