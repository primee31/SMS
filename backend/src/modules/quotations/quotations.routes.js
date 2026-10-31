import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  listQuotationsSchema,
  changeStatusSchema,
  convertToSubscriptionSchema,
} from './quotations.schema.js';
import * as quotationsService from './quotations.service.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/quotations
router.get(
  '/',
  validate(listQuotationsSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await quotationsService.listQuotations(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/quotations — ADMIN, STAFF only
router.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(createQuotationSchema),
  async (req, res, next) => {
    try {
      const quotation = await quotationsService.createQuotation(
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/quotations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const quotation = await quotationsService.getQuotationById(req.params.id, req.user);
    res.json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/quotations/:id — ADMIN, STAFF only
router.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(updateQuotationSchema),
  async (req, res, next) => {
    try {
      const quotation = await quotationsService.updateQuotation(
        req.params.id,
        req.body,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/quotations/:id/status — ADMIN, STAFF only
router.post(
  '/:id/status',
  requireRole('ADMIN', 'STAFF'),
  validate(changeStatusSchema),
  async (req, res, next) => {
    try {
      const quotation = await quotationsService.changeQuotationStatus(
        req.params.id,
        req.body.status,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: quotation });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/quotations/:id/convert — ADMIN, STAFF only
router.post(
  '/:id/convert',
  requireRole('ADMIN', 'STAFF'),
  validate(convertToSubscriptionSchema),
  async (req, res, next) => {
    try {
      const subscription = await quotationsService.convertToSubscription(
        req.params.id,
        req.body,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/v1/quotations/:id — ADMIN only
router.delete(
  '/:id',
  requireRole('ADMIN'),
  async (req, res, next) => {
    try {
      const result = await quotationsService.deleteQuotation(
        req.params.id,
        req.user,
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
