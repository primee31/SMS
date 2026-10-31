import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import {
  createSubscriptionSchema,
  updateSubscriptionSchema,
  listSubscriptionsSchema,
  cancelSubscriptionSchema,
  pauseSubscriptionSchema,
} from './subscriptions.schema.js';
import * as subscriptionsService from './subscriptions.service.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/subscriptions
router.get(
  '/',
  validate(listSubscriptionsSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await subscriptionsService.listSubscriptions(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/subscriptions — ADMIN, STAFF
router.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(createSubscriptionSchema),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.createSubscription(
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/subscriptions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const subscription = await subscriptionsService.getSubscriptionById(req.params.id, req.user);
    res.json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/subscriptions/:id — ADMIN, STAFF
router.patch(
  '/:id',
  requireRole('ADMIN', 'STAFF'),
  validate(updateSubscriptionSchema),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.updateSubscription(
        req.params.id,
        req.body,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/subscriptions/:id/cancel
router.post(
  '/:id/cancel',
  requireRole('ADMIN', 'STAFF'),
  validate(cancelSubscriptionSchema),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.cancelSubscription(
        req.params.id,
        req.body.reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/subscriptions/:id/pause
router.post(
  '/:id/pause',
  requireRole('ADMIN', 'STAFF'),
  validate(pauseSubscriptionSchema),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.pauseSubscription(
        req.params.id,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/subscriptions/:id/resume
router.post(
  '/:id/resume',
  requireRole('ADMIN', 'STAFF'),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.resumeSubscription(
        req.params.id,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/subscriptions/:id/renew
router.post(
  '/:id/renew',
  requireRole('ADMIN', 'STAFF'),
  async (req, res, next) => {
    try {
      const subscription = await subscriptionsService.renewSubscription(
        req.params.id,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: subscription });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
