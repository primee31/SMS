import { z } from 'zod';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{9,}$/;

export const createStaffSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(9, 'Password must be longer than 8 characters')
    .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, and one special character'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required')
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).optional()
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'CUSTOMER']).optional(),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName', 'role']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});
