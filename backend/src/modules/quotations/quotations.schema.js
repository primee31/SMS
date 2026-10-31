import { z } from 'zod';

const quotationLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  additionalPrice: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
});

export const createQuotationSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  lines: z.array(quotationLineSchema).min(1),
});

export const updateQuotationSchema = z.object({
  planId: z.string().uuid().optional().nullable(),
  templateId: z.string().uuid().optional().nullable(),
  validUntil: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  lines: z.array(quotationLineSchema).min(1).optional(),
});

export const listQuotationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'SENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED']).optional(),
  customerId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'quotationNumber', 'grandTotal', 'validUntil']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const changeStatusSchema = z.object({
  status: z.enum(['SENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED']),
});

export const convertToSubscriptionSchema = z.object({
  startDate: z.string().datetime().optional(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  notes: z.string().max(2000).optional(),
});
