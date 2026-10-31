import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
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
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      customer: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      refreshToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    }
  };
});

function signTestToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Role-Based Access Control & Ownership Isolation Suite', () => {
  const adminUser = {
    id: 'admin-id-1',
    email: 'admin@brightloop.com',
    role: 'ADMIN',
    isActive: true
  };

  const staffUser = {
    id: 'staff-id-1',
    email: 'staff@brightloop.com',
    role: 'STAFF',
    isActive: true
  };

  const customerUserA = {
    id: 'cust-user-a',
    email: 'customer.a@example.com',
    role: 'CUSTOMER',
    isActive: true,
    customer: { id: 'cust-rec-a', name: 'Customer A' }
  };

  const customerUserB = {
    id: 'cust-user-b',
    email: 'customer.b@example.com',
    role: 'CUSTOMER',
    isActive: true,
    customer: { id: 'cust-rec-b', name: 'Customer B' }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Unauthorized Access Handling', () => {
    it('should return 401 Unauthorized when no token is provided', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when token is invalid or forged', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer forged-invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('Admin-only Staff Creation', () => {
    it('should allow ADMIN to create staff members', async () => {
      prisma.user.findFirst.mockResolvedValue(adminUser);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }) => ({
        id: 'new-staff-id',
        ...data,
        createdAt: new Date()
      }));
      prisma.auditLog.create.mockResolvedValue({});

      const token = signTestToken(adminUser);

      const res = await request(app)
        .post('/api/v1/users/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'new.staff@brightloop.com',
          password: 'StaffPassword#1',
          firstName: 'New',
          lastName: 'Staff'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('STAFF');
    });

    it('should deny STAFF from creating other staff members (403 Forbidden)', async () => {
      prisma.user.findFirst.mockResolvedValue(staffUser);
      const token = signTestToken(staffUser);

      const res = await request(app)
        .post('/api/v1/users/staff')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'unauthorized@brightloop.com',
          password: 'StaffPassword#1',
          firstName: 'Fake',
          lastName: 'Staff'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should deny CUSTOMER from accessing user management routes (403 Forbidden)', async () => {
      prisma.user.findFirst.mockResolvedValue(customerUserA);
      const token = signTestToken(customerUserA);

      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Customer Data Isolation', () => {
    it('should allow a Customer to view their own profile record', async () => {
      prisma.user.findFirst.mockResolvedValue(customerUserA);
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rec-a',
        name: 'Customer A',
        email: customerUserA.email,
        status: 'ACTIVE'
      });

      const token = signTestToken(customerUserA);

      const res = await request(app)
        .get('/api/v1/customers/cust-rec-a')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('cust-rec-a');
    });

    it('should forbid a Customer from accessing another Customer record', async () => {
      prisma.user.findFirst.mockResolvedValue(customerUserA);
      const token = signTestToken(customerUserA);

      // Customer A attempts to access Customer B's record
      const res = await request(app)
        .get('/api/v1/customers/cust-rec-b')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_OWNERSHIP');
    });

    it('should allow STAFF to access any customer record', async () => {
      prisma.user.findFirst.mockResolvedValue(staffUser);
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-rec-b',
        name: 'Customer B',
        email: 'customer.b@example.com'
      });

      const token = signTestToken(staffUser);

      const res = await request(app)
        .get('/api/v1/customers/cust-rec-b')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('cust-rec-b');
    });
  });
});
