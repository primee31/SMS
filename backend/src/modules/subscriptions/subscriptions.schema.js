import { z } from 'zod';

const subscriptionLineSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  description: z.string().max(500).optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().min(0),
  additionalPrice: z.number().min(0).default(0),
});

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid(),
  planId: z.string().uuid(),
  quotationId: z.string().uuid().optional().nullable(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
  startDate: z.string().datetime().optional(),
  autoRenew: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
  lines: z.array(subscriptionLineSchema).min(1),
});

export const updateSubscriptionSchema = z.object({
  autoRenew: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(subscriptionLineSchema).min(1).optional(),
});

export const listSubscriptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CANCELLED', 'CLOSED', 'EXPIRED']).optional(),
  customerId: z.string().uuid().optional(),
  planId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'subscriptionNumber', 'startDate', 'nextBillingDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const cancelSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const pauseSubscriptionSchema = z.object({
  reason: z.string().max(500).optional(),
});
