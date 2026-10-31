import { Router } from 'express';
import * as productsController from './products.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  productQuerySchema
} from './products.validation.js';

const router = Router();

router.use(authenticateToken);

// Product listing & reading available to authenticated users (Admin, Staff, Customer)
router.get('/', validate(productQuerySchema, 'query'), productsController.list);
router.get('/:id', productsController.getById);

// Product mutations restricted to Admin
router.post('/', requireRole('ADMIN'), validate(createProductSchema), productsController.create);
router.patch('/:id', requireRole('ADMIN'), validate(updateProductSchema), productsController.update);
router.delete('/:id', requireRole('ADMIN'), productsController.remove);

// Product Variant routes restricted to Admin
router.post('/:id/variants', requireRole('ADMIN'), validate(createVariantSchema), productsController.createVariant);
router.patch('/:id/variants/:variantId', requireRole('ADMIN'), validate(updateVariantSchema), productsController.updateVariant);
router.delete('/:id/variants/:variantId', requireRole('ADMIN'), productsController.removeVariant);

export default router;
