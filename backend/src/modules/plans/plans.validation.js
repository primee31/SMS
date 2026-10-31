import { z } from 'zod';

export const createPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  code: z.string().min(1, 'Plan code is required').regex(/^[A-Z0-9_-]+$/, 'Plan code must be uppercase letters, numbers, hyphens or underscores'),
  description: z.string().optional().nullable(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).default('MONTHLY'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  minQuantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
  availableFrom: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable()),
  availableUntil: z.string().datetime({ offset: true }).optional().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional().nullable()),
  autoClose: z.boolean().default(false),
  earlyCloseAllowed: z.boolean().default(true),
  pauseAllowed: z.boolean().default(true),
  renewalAllowed: z.boolean().default(true),
  isActive: z.boolean().default(true),
  productIds: z.array(z.string().uuid()).optional()
}).refine((data) => {
  if (data.availableFrom && data.availableUntil) {
    return new Date(data.availableFrom) <= new Date(data.availableUntil);
  }
  return true;
}, {
  message: 'availableUntil must be on or after availableFrom',
  path: ['availableUntil']
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().regex(/^[A-Z0-9_-]+$/).optional(),
  description: z.string().optional().nullable(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  price: z.coerce.number().min(0).optional(),
  minQuantity: z.coerce.number().int().min(1).optional(),
  availableFrom: z.string().optional().nullable(),
  availableUntil: z.string().optional().nullable(),
  autoClose: z.boolean().optional(),
  earlyCloseAllowed: z.boolean().optional(),
  pauseAllowed: z.boolean().optional(),
  renewalAllowed: z.boolean().optional(),
  isActive: z.boolean().optional()
});

export const planQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  billingFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  isActive: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  sortBy: z.enum(['createdAt', 'name', 'price', 'billingFrequency']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
