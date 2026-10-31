import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { listInvoicesSchema, createManualInvoiceSchema, voidInvoiceSchema } from './invoices.schema.js';
import * as invoicesService from './invoices.service.js';

const router = Router();
router.use(authenticateToken);

// GET /api/v1/invoices
router.get(
  '/',
  validate(listInvoicesSchema, 'query'),
  async (req, res, next) => {
    try {
      const result = await invoicesService.listInvoices(req.query, req.user);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/v1/invoices — create manual invoice
router.post(
  '/',
  requireRole('ADMIN', 'STAFF'),
  validate(createManualInvoiceSchema),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.createManualInvoice(
        req.body,
        req.user.id,
        req.ip,
        req.headers['user-agent']
      );
      res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/invoices/:id
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await invoicesService.getInvoiceById(req.params.id, req.user);
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/invoices/:id/post — mark draft as posted
router.post('/:id/post', requireRole('ADMIN', 'STAFF'), async (req, res, next) => {
  try {
    const invoice = await invoicesService.postInvoice(
      req.params.id,
      req.user,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/invoices/:id/void — void an invoice
router.post(
  '/:id/void',
  requireRole('ADMIN'),
  validate(voidInvoiceSchema),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.voidInvoice(
        req.params.id,
        req.body?.reason,
        req.user,
        req.ip,
        req.headers['user-agent']
      );
      res.json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
