import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { createPaymentSchema, listPaymentsSchema, refundPaymentSchema } from './payments.schema.js';
import * as paymentsService from './payments.service.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/payments
router.get(
  '/',
  validate(listPaymentsSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await paymentsService.listPayments(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/payments — record a payment
router.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(createPaymentSchema),
  async (req, res, next) => {
    try {
      const payment = await paymentsService.createPayment(
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/payments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const payment = await paymentsService.getPaymentById(req.params.id, req.user);
    res.json({ success: true, data: payment });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/payments/:id/refund
router.post(
  '/:id/refund',
  requireRole('ADMIN'),
  validate(refundPaymentSchema),
  async (req, res, next) => {
    try {
      const payment = await paymentsService.refundPayment(
        req.params.id,
        req.body?.reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
