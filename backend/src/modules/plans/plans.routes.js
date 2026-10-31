import { Router } from 'express';
import * as plansController from './plans.controller.js';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createPlanSchema,
  updatePlanSchema,
  planQuerySchema
} from './plans.validation.js';

const router = Router();

router.use(authenticateToken);

// Plans listing & retrieval available to all authenticated roles
router.get('/', validate(planQuerySchema, 'query'), plansController.list);
router.get('/:id', plansController.getById);

// Plan mutations restricted to Admin
router.post('/', requireRole('ADMIN'), validate(createPlanSchema), plansController.create);
router.patch('/:id', requireRole('ADMIN'), validate(updatePlanSchema), plansController.update);
router.delete('/:id', requireRole('ADMIN'), plansController.remove);

export default router;
