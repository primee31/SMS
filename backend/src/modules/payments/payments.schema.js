import { z } from 'zod';

export const createPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
  paymentMethod: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CASH', 'MANUAL', 'CHECK']).default('MANUAL'),
  transactionReference: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  paidAt: z.string().datetime().optional(),
});

export const refundPaymentSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listPaymentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  sortBy: z.enum(['createdAt', 'paidAt', 'amount']).default('paidAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
