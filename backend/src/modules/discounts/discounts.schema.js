import { z } from 'zod';

export const createDiscountSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
  description: z.string().max(500).optional(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).default('PERCENTAGE'),
  value: z.number().positive(),
  maxUses: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  minOrderAmount: z.number().min(0).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateDiscountSchema = createDiscountSchema.partial();

export const listDiscountsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
});

export const validateDiscountSchema = z.object({
  code: z.string().min(1),
  orderAmount: z.number().min(0).optional(),
});
