import { Router } from 'express';
import * as customersController from './customers.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole, requireOwnershipOrRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema
} from './customers.validation.js';

const router = Router();

router.use(authenticateToken);

// Admin and Staff can list all and create customers
router.get('/', requireRole('ADMIN', 'STAFF'), validate(customerQuerySchema, 'query'), customersController.list);
router.post('/', requireRole('ADMIN', 'STAFF'), validate(createCustomerSchema), customersController.create);

// Customers can view and update their own record; Admin and Staff can access any
router.get('/:id', requireOwnershipOrRole('ADMIN', 'STAFF'), customersController.getById);
router.patch('/:id', requireOwnershipOrRole('ADMIN', 'STAFF'), validate(updateCustomerSchema), customersController.update);

// Only Admin can delete/archive customers
router.delete('/:id', requireRole('ADMIN'), customersController.remove);

export default router;
