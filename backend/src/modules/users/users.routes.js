import { Router } from 'express';
import * as usersController from './users.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole, requireOwnershipOrRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createStaffSchema,
  updateUserSchema,
  userQuerySchema
} from './users.validation.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Admin-only listing and staff creation
router.get('/', requireRole('ADMIN'), validate(userQuerySchema, 'query'), usersController.list);
router.post('/staff', requireRole('ADMIN'), validate(createStaffSchema), usersController.createStaff);

// User access: Admin or the user themselves
router.get('/:id', requireOwnershipOrRole('ADMIN'), usersController.getById);
router.patch('/:id', requireOwnershipOrRole('ADMIN'), validate(updateUserSchema), usersController.update);

// Delete: Admin only
router.delete('/:id', requireRole('ADMIN'), usersController.remove);

export default router;
