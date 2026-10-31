import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  type: z.enum(['SERVICE', 'GOODS']).default('SERVICE'),
  salesPrice: z.coerce.number().min(0, 'Sales price must be positive'),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive').default(0),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  variants: z.array(
    z.object({
      name: z.string().min(1, 'Variant name is required'),
      sku: z.string().optional().nullable(),
      additionalPrice: z.coerce.number().default(0),
      isActive: z.boolean().default(true)
    })
  ).optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['SERVICE', 'GOODS']).optional(),
  salesPrice: z.coerce.number().min(0).optional(),
  costPrice: z.coerce.number().min(0).optional(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const createVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  sku: z.string().optional().nullable(),
  additionalPrice: z.coerce.number().default(0),
  isActive: z.boolean().default(true)
});

export const updateVariantSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().optional().nullable(),
  additionalPrice: z.coerce.number().optional(),
  isActive: z.boolean().optional()
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  type: z.enum(['SERVICE', 'GOODS']).optional(),
  isActive: z.preprocess((val) => (val === 'true' ? true : val === 'false' ? false : val), z.boolean().optional()),
  sortBy: z.enum(['createdAt', 'name', 'salesPrice', 'costPrice']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
