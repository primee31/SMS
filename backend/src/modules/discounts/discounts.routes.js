import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { createDiscountSchema, updateDiscountSchema, listDiscountsSchema, validateDiscountSchema } from './discounts.schema.js';
import * as discountsService from './discounts.service.js';

const router = Router();

router.use(authenticateToken);

// GET /api/v1/discounts
router.get(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(listDiscountsSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await discountsService.listDiscounts(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/discounts/validate — any authenticated user may validate a code
router.post('/validate', validate(validateDiscountSchema), async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    const result = await discountsService.validateDiscount(code, orderAmount);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/discounts/:id
router.get('/:id', requireRole('ADMIN', 'STAFF'), async (req, res, next) => {
  try {
    const discount = await discountsService.getDiscountById(req.params.id);
    res.json({ success: true, data: discount });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/discounts — ADMIN only
router.post(
  '/',
  requireRole('ADMIN'),
  validate(createDiscountSchema),
  async (req, res, next) => {
    try {
      const discount = await discountsService.createDiscount(req.body, req.user.id, req.ip, req.headers['user-agent']);
      res.status(201).json({ success: true, data: discount });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/discounts/:id — ADMIN only
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateDiscountSchema),
  async (req, res, next) => {
    try {
      const discount = await discountsService.updateDiscount(req.params.id, req.body, req.user.id, req.ip, req.headers['user-agent']);
      res.json({ success: true, data: discount });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/discounts/:id — ADMIN only
router.delete('/:id', requireRole('ADMIN'), async (req, res, next) => {
  try {
    const result = await discountsService.deleteDiscount(req.params.id, req.user.id, req.ip, req.headers['user-agent']);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
