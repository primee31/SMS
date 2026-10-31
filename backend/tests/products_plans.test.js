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
        findFirst: vi.fn()
      },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      productVariant: {
        findFirst: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn()
      },
      plan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      planProduct: {
        createMany: vi.fn()
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

function signAdminToken() {
  return jwt.sign(
    { userId: 'admin-id-1', email: 'admin@brightloop.com', role: 'ADMIN' },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Products, Variants & Plans CRUD Suite', () => {
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

  describe('Product CRUD and Variant Calculations', () => {
    it('should create a product and calculate variant effective price (Odoo brand adds 560)', async () => {
      const baseProduct = {
        id: 'prod-uuid-1',
        name: 'Enterprise ERP Suite',
        type: 'SERVICE',
        salesPrice: 1200.00,
        costPrice: 400.00,
        notes: 'ERP core',
        isActive: true,
        variants: [
          {
            id: 'var-1',
            name: 'Standard Edition',
            sku: 'ERP-STD',
            additionalPrice: 0.00
          },
          {
            id: 'var-2',
            name: 'Odoo Brand Connector',
            sku: 'ERP-ODOO-560',
            additionalPrice: 560.00 // The PDF required example
          }
        ]
      };

      prisma.product.create.mockResolvedValue({ id: 'prod-uuid-1', ...baseProduct });
      prisma.product.findUnique.mockResolvedValue(baseProduct);

      const token = signAdminToken();

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Enterprise ERP Suite',
          type: 'SERVICE',
          salesPrice: 1200.00,
          costPrice: 400.00,
          variants: [
            { name: 'Standard Edition', sku: 'ERP-STD', additionalPrice: 0 },
            { name: 'Odoo Brand Connector', sku: 'ERP-ODOO-560', additionalPrice: 560 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Enterprise ERP Suite');

      // Verify variant effective pricing: base + 560 = 1760
      const odooVariant = res.body.data.variants.find(v => v.name === 'Odoo Brand Connector');
      expect(odooVariant).toBeDefined();
      expect(odooVariant.additionalPrice).toBe(560);
      expect(odooVariant.effectivePrice).toBe(1760);
    });

    it('should list products and return pagination meta', async () => {
      prisma.product.count.mockResolvedValue(1);
      prisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-uuid-1',
          name: 'Cloud Hosting',
          type: 'SERVICE',
          salesPrice: 100.00,
          costPrice: 20.00,
          variants: []
        }
      ]);

      const token = signAdminToken();

      const res = await request(app)
        .get('/api/v1/products?page=1&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination.total).toBe(1);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should add a standalone variant to an existing product', async () => {
      prisma.product.findFirst.mockResolvedValue({
        id: 'prod-uuid-1',
        name: 'Hardware Box',
        salesPrice: 500.00,
        variants: []
      });
      prisma.productVariant.create.mockResolvedValue({
        id: 'var-new-1',
        productId: 'prod-uuid-1',
        name: 'Turbo Acceleration Pack',
        additionalPrice: 150.00,
        isActive: true
      });

      const token = signAdminToken();

      const res = await request(app)
        .post('/api/v1/products/prod-uuid-1/variants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Turbo Acceleration Pack',
          additionalPrice: 150.00
        });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe('Turbo Acceleration Pack');
      expect(res.body.data.effectivePrice).toBe(650.00); // 500 + 150
    });
  });

  describe('Plan Validation & Policies', () => {
    it('should validate plan billing frequencies and policies', async () => {
      const planPayload = {
        name: 'Annual Business Pro',
        code: 'PLAN_ANNUAL_PRO',
        billingFrequency: 'YEARLY',
        price: 999.00,
        minQuantity: 1,
        autoClose: false,
        earlyCloseAllowed: true,
        pauseAllowed: true,
        renewalAllowed: true
      };

      prisma.plan.findUnique.mockResolvedValue(null);
      prisma.plan.create.mockResolvedValue({ id: 'plan-uuid-1', ...planPayload });

      const token = signAdminToken();

      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${token}`)
        .send(planPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.billingFrequency).toBe('YEARLY');
    });

    it('should reject invalid plan with negative price or minQuantity < 1', async () => {
      const token = signAdminToken();

      const res = await request(app)
        .post('/api/v1/plans')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Plan',
          code: 'PLAN_INVALID',
          billingFrequency: 'MONTHLY',
          price: -50.00, // Invalid negative price
          minQuantity: 0  // Invalid minQuantity
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
