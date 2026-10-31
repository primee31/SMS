import { z } from 'zod';

export const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'POSTED', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'VOID', 'CANCELLED']).optional(),
  customerId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'invoiceNumber', 'issueDate', 'dueDate', 'grandTotal']).default('issueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const createManualInvoiceSchema = z.object({
  subscriptionId: z.string().uuid(),
  billingPeriodStart: z.string().datetime(),
  billingPeriodEnd: z.string().datetime(),
  dueDate: z.string().datetime(),
  notes: z.string().max(2000).optional(),
});

export const voidInvoiceSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const postInvoiceSchema = z.object({}).optional();
