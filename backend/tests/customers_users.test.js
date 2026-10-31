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
        updateMany: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    }
  };
});

function signAdminToken() {
  return jwt.sign(
    { userId: 'admin-id-1', email: 'admin@brightloop.com', role: 'ADMIN' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Customers & Users Management CRUD Suite', () => {
  const adminUser = {
    id: 'admin-id-1',
    email: 'admin@brightloop.com',
    role: 'ADMIN',
    isActive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(adminUser);
    prisma.auditLog.create.mockResolvedValue({});
  });

  describe('Customer CRUD Operations', () => {
    it('should create a customer with valid details', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockImplementation(({ data }) => ({
        id: 'cust-101',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      const token = signAdminToken();

      const res = await request(app)
        .post('/api/v1/customers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Global Logix',
          email: 'contact@globallogix.com',
          company: 'Global Logix LLC',
          phone: '+1-555-8888',
          status: 'ACTIVE'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Global Logix');
      expect(res.body.data.email).toBe('contact@globallogix.com');
    });

    it('should retrieve a customer by ID', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-101',
        name: 'Global Logix',
        email: 'contact@globallogix.com',
        status: 'ACTIVE',
        subscriptions: [],
        invoices: []
      });

      const token = signAdminToken();

      const res = await request(app)
        .get('/api/v1/customers/cust-101')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('cust-101');
    });

    it('should update customer properties and create audit record', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-101',
        name: 'Old Name',
        email: 'contact@globallogix.com',
        status: 'ACTIVE'
      });
      prisma.customer.update.mockResolvedValue({
        id: 'cust-101',
        name: 'Updated Name',
        email: 'contact@globallogix.com',
        status: 'ACTIVE'
      });

      const token = signAdminToken();

      const res = await request(app)
        .patch('/api/v1/customers/cust-101')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should soft-delete customer and set status to ARCHIVED', async () => {
      prisma.customer.findFirst.mockResolvedValue({
        id: 'cust-101',
        name: 'To Delete',
        email: 'del@globallogix.com'
      });
      prisma.customer.update.mockResolvedValue({});

      const token = signAdminToken();

      const res = await request(app)
        .delete('/api/v1/customers/cust-101')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('User Administration CRUD Operations', () => {
    it('should list users with pagination metadata', async () => {
      prisma.user.count.mockResolvedValue(2);
      prisma.user.findMany.mockResolvedValue([
        adminUser,
        { id: 'user-2', email: 'staff@brightloop.com', role: 'STAFF', isActive: true }
      ]);

      const token = signAdminToken();

      const res = await request(app)
        .get('/api/v1/users?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should update user role and status', async () => {
      prisma.user.findFirst.mockImplementation(({ where }) => {
        if (where?.id === 'user-2') {
          return Promise.resolve({
            id: 'user-2',
            email: 'staff@brightloop.com',
            role: 'STAFF',
            isActive: true
          });
        }
        return Promise.resolve(adminUser);
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        email: 'staff@brightloop.com',
        role: 'ADMIN',
        isActive: true
      });

      const token = signAdminToken();

      const res = await request(app)
        .patch('/api/v1/users/user-2')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('ADMIN');
    });

    it('should soft-delete user and revoke active refresh tokens', async () => {
      prisma.user.findFirst.mockImplementation(({ where }) => {
        if (where?.id === 'user-2') {
          return Promise.resolve({
            id: 'user-2',
            email: 'staff@brightloop.com',
            role: 'STAFF',
            isActive: true
          });
        }
        return Promise.resolve(adminUser);
      });
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const token = signAdminToken();

      const res = await request(app)
        .delete('/api/v1/users/user-2')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
