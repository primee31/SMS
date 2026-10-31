import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { createTaxSchema, updateTaxSchema, listTaxesSchema } from './taxes.schema.js';
import * as taxesService from './taxes.service.js';

const router = Router();

// All tax routes require authentication
router.use(authenticateToken);

// GET /api/v1/taxes — list all taxes (all authenticated)
router.get(
  '/',
  validate(listTaxesSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await taxesService.listTaxes(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/taxes/:id
router.get('/:id', async (req, res, next) => {
  try {
    const tax = await taxesService.getTaxById(req.params.id);
    res.json({ success: true, data: tax });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/taxes — ADMIN only
router.post(
  '/',
  requireRole('ADMIN'),
  validate(createTaxSchema),
  async (req, res, next) => {
    try {
      const tax = await taxesService.createTax(
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: tax });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/v1/taxes/:id — ADMIN only
router.patch(
  '/:id',
  requireRole('ADMIN'),
  validate(updateTaxSchema),
  async (req, res, next) => {
    try {
      const tax = await taxesService.updateTax(
        req.params.id,
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: tax });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/taxes/:id — ADMIN only
router.delete(
  '/:id',
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const result = await taxesService.deleteTax(
        req.params.id,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
