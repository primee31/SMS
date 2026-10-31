import { z } from 'zod';

export const createTaxSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).toUpperCase(),
  rate: z.number().min(0).max(1), // 0.0000 – 1.0000
  type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  description: z.string().max(500).optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateTaxSchema = createTaxSchema.partial();

export const listTaxesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  search: z.string().optional(),
});
