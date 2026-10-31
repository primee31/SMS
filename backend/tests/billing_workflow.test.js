import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { env } from '../src/config/env.js';

const MOCK_IDS = {
  customer: 'a0000000-0000-4000-8000-000000000001',
  product: 'b0000000-0000-4000-8000-000000000002',
  plan: 'c0000000-0000-4000-8000-000000000003',
  quotation: 'd0000000-0000-4000-8000-000000000004',
  subscription: 'e0000000-0000-4000-8000-000000000005',
  invoice: 'f0000000-0000-4000-8000-000000000006',
  payment: '00000000-0000-4000-8000-000000000007',
};

vi.mock('../src/config/prisma.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      customer: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      productVariant: {
        findFirst: vi.fn(),
      },
      plan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      tax: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      discount: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      quotation: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      quotationLine: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      subscription: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      subscriptionLine: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      invoice: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      invoiceLine: {
        createMany: vi.fn(),
        findMany: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        if (Array.isArray(cb)) {
          return await Promise.all(cb);
        }
        return await cb(prisma);
      }),
    },
  };
});

function signToken(role = 'ADMIN', userId = 'user-1') {
  return jwt.sign(
    { userId, email: `${role.toLowerCase()}@brightloop.com`, role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Full Billing & Order Lifecycle Workflow Suite', () => {
  const adminToken = signToken('ADMIN', 'admin-id-1');
  const staffToken = signToken('STAFF', 'staff-id-1');

  const mockAdmin = {
    id: 'admin-id-1',
    email: 'admin@brightloop.com',
    role: 'ADMIN',
    isActive: true,
  };

  const mockCustomer = {
    id: MOCK_IDS.customer,
    userId: 'cust-user-1',
    name: 'Acme Corp',
    email: 'customer@brightloop.com',
    deletedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(mockAdmin);
    prisma.customer.findFirst.mockResolvedValue(mockCustomer);
    prisma.customer.findUnique.mockResolvedValue(mockCustomer);
    prisma.auditLog.create.mockResolvedValue({});
  });

  describe('Quotation Lifecycle', () => {
    it('should allow Staff to create a quotation with valid UUIDs and lines', async () => {
      const mockQuote = {
        id: MOCK_IDS.quotation,
        quotationNumber: 'QUO-2026-0001',
        customerId: MOCK_IDS.customer,
        status: 'DRAFT',
        subtotal: 1000,
        taxTotal: 0,
        discountTotal: 0,
        grandTotal: 1000,
        customer: mockCustomer,
        lines: [],
      };

      prisma.quotation.findFirst.mockResolvedValue(null);
      prisma.quotation.create.mockResolvedValue(mockQuote);
      prisma.quotation.findUnique.mockResolvedValue(mockQuote);
      prisma.quotationLine.createMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/v1/quotations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: MOCK_IDS.customer,
          terms: 'Net 30 days',
          lines: [
            {
              productId: MOCK_IDS.product,
              quantity: 1,
              unitPrice: 1000,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(MOCK_IDS.quotation);
    });

    it('should transition quotation status from SENT to CONFIRMED', async () => {
      const sentQuote = {
        id: MOCK_IDS.quotation,
        status: 'SENT',
        customerId: MOCK_IDS.customer,
        customer: mockCustomer,
      };

      prisma.quotation.findFirst.mockResolvedValue(sentQuote);
      prisma.quotation.update.mockResolvedValue({
        ...sentQuote,
        status: 'CONFIRMED',
      });
      prisma.quotation.findUnique.mockResolvedValue({
        ...sentQuote,
        status: 'CONFIRMED',
      });

      const res = await request(app)
        .post(`/api/v1/quotations/${MOCK_IDS.quotation}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CONFIRMED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CONFIRMED');
    });
  });

  describe('Quotation to Subscription Conversion', () => {
    it('should convert a CONFIRMED quotation with plan into an ACTIVE subscription', async () => {
      const confirmedQuote = {
        id: MOCK_IDS.quotation,
        customerId: MOCK_IDS.customer,
        planId: MOCK_IDS.plan,
        status: 'CONFIRMED',
        customer: mockCustomer,
        plan: {
          id: MOCK_IDS.plan,
          name: 'Enterprise Plan',
          billingFrequency: 'MONTHLY',
          price: 1200,
        },
        grandTotal: 1200,
        subscriptions: [],
        lines: [
          {
            id: 'line-1',
            productId: MOCK_IDS.product,
            quantity: 1,
            unitPrice: 1200.0,
            additionalPrice: 0,
            subtotal: 1200.0,
            discountAmount: 0,
            taxAmount: 0,
            total: 1200.0,
            product: { name: 'SaaS License' },
          },
        ],
      };

      const newSub = {
        id: MOCK_IDS.subscription,
        subscriptionNumber: 'SUB-2026-0001',
        customerId: MOCK_IDS.customer,
        status: 'ACTIVE',
        customer: mockCustomer,
      };

      prisma.quotation.findFirst.mockResolvedValue(confirmedQuote);
      prisma.subscription.findFirst.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(newSub);
      prisma.subscription.findUnique.mockResolvedValue(newSub);
      prisma.subscriptionLine.createMany.mockResolvedValue({ count: 1 });
      prisma.quotation.update.mockResolvedValue(confirmedQuote);

      const res = await request(app)
        .post(`/api/v1/quotations/${MOCK_IDS.quotation}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDate: new Date().toISOString(),
          billingFrequency: 'MONTHLY',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
    });
  });

  describe('Invoice & Payment Settlement', () => {
    it('should create a manual invoice for a subscription and enforce idempotency', async () => {
      const mockSub = {
        id: MOCK_IDS.subscription,
        customerId: MOCK_IDS.customer,
        customer: mockCustomer,
        lines: [
          {
            id: 'sub-line-1',
            productId: MOCK_IDS.product,
            quantity: 1,
            unitPrice: 500,
            additionalPrice: 0,
            product: { id: MOCK_IDS.product, name: 'Cloud Hosting' },
          },
        ],
      };

      const mockInvoice = {
        id: MOCK_IDS.invoice,
        invoiceNumber: 'INV-2026-0001',
        subscriptionId: MOCK_IDS.subscription,
        customerId: MOCK_IDS.customer,
        status: 'POSTED',
        subtotal: 500.0,
        grandTotal: 500.0,
        amountDue: 500.0,
        amountPaid: 0.0,
        customer: mockCustomer,
        lines: [],
      };

      prisma.subscription.findFirst.mockResolvedValue(mockSub);
      prisma.invoice.findFirst.mockResolvedValue(null); // No duplicate invoice
      prisma.tax.findFirst.mockResolvedValue(null);
      prisma.invoice.create.mockResolvedValue(mockInvoice);
      prisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      prisma.invoice.update.mockResolvedValue(mockInvoice);
      prisma.invoiceLine.createMany.mockResolvedValue({ count: 1 });

      const periodStart = '2026-11-01T00:00:00.000Z';
      const periodEnd = '2026-11-30T23:59:59.000Z';
      const dueDate = '2026-12-15T23:59:59.000Z';

      const res = await request(app)
        .post('/api/v1/invoices')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          subscriptionId: MOCK_IDS.subscription,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          dueDate: dueDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('POSTED');
      expect(res.body.data.invoiceNumber).toBe('INV-2026-0001');
    });

    it('should record full payment against invoice and settle balance to 0', async () => {
      const postedInvoice = {
        id: MOCK_IDS.invoice,
        invoiceNumber: 'INV-2026-0001',
        customerId: MOCK_IDS.customer,
        status: 'POSTED',
        amountDue: 500.0,
        amountPaid: 0.0,
        grandTotal: 500.0,
      };

      const mockPayment = {
        id: MOCK_IDS.payment,
        paymentNumber: 'PAY-2026-0001',
        invoiceId: MOCK_IDS.invoice,
        customerId: MOCK_IDS.customer,
        amount: 500.0,
        status: 'COMPLETED',
        paymentMethod: 'BANK_TRANSFER',
      };

      prisma.invoice.findFirst.mockResolvedValue(postedInvoice);
      prisma.payment.findFirst.mockResolvedValue(null);
      prisma.payment.create.mockResolvedValue(mockPayment);
      prisma.invoice.update.mockResolvedValue({
        ...postedInvoice,
        status: 'PAID',
        amountPaid: 500.0,
        amountDue: 0.0,
      });

      const payRes = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          invoiceId: MOCK_IDS.invoice,
          amount: 500,
          paymentMethod: 'BANK_TRANSFER',
          transactionReference: 'WIRE-99210',
        });

      expect(payRes.status).toBe(201);
      expect(payRes.body.success).toBe(true);
      expect(payRes.body.data.status).toBe('COMPLETED');
      expect(payRes.body.data.amount).toBe(500);
    });
  });
});
