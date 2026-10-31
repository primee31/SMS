import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import plansRoutes from './modules/plans/plans.routes.js';
import taxesRoutes from './modules/taxes/taxes.routes.js';
import discountsRoutes from './modules/discounts/discounts.routes.js';
import quotationsRoutes from './modules/quotations/quotations.routes.js';
import subscriptionsRoutes from './modules/subscriptions/subscriptions.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';

export function createApp() {
  const app = express();

  // Security and utilities middleware
  app.use(helmet());
  app.use(cors({
    origin: env.FRONTEND_URL,
    credentials: true
  }));
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check endpoint
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/customers', customersRoutes);
  app.use('/api/v1/products', productsRoutes);
  app.use('/api/v1/plans', plansRoutes);
  app.use('/api/v1/taxes', taxesRoutes);
  app.use('/api/v1/discounts', discountsRoutes);
  app.use('/api/v1/quotations', quotationsRoutes);
  app.use('/api/v1/subscriptions', subscriptionsRoutes);
  app.use('/api/v1/invoices', invoicesRoutes);
  app.use('/api/v1/payments', paymentsRoutes);

  // 404 handler for undefined API routes
  app.use('/api/v1', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        code: 'NOT_FOUND'
      }
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
