/**
 * Brightloop SMS — Background Billing Worker
 *
 * Responsibilities:
 * 1. Process 'billing' queue: generate invoices for subscriptions due today
 * 2. Process 'overdue' queue: mark past-due POSTED invoices as OVERDUE
 * 3. Advance subscription billing period after successful invoice creation
 *
 * Run with: npm run worker (from /backend)
 */
import { Worker } from 'bullmq';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { generateInvoiceForSubscription, markOverdueInvoices } from './modules/invoices/invoices.service.js';
import { computePeriodEnd } from './modules/quotations/quotations.service.js';

const connection = {
  host: new URL(env.REDIS_URL).hostname,
  port: Number(new URL(env.REDIS_URL).port) || 6379,
};

// ─── Billing Worker ───────────────────────────────────────────────────────────

const billingWorker = new Worker(
  'billing',
  async (job) => {
    const { subscriptionId } = job.data;
    console.log(`[BillingWorker] Processing invoice for subscription: ${subscriptionId}`);

    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, status: 'ACTIVE', deletedAt: null },
    });

    if (!subscription) {
      console.warn(`[BillingWorker] Subscription ${subscriptionId} not found or not active. Skipping.`);
      return { skipped: true };
    }

    const periodStart = subscription.currentPeriodStart;
    const periodEnd = subscription.currentPeriodEnd;

    // Generate the invoice (idempotent)
    const { invoice, created } = await generateInvoiceForSubscription(subscriptionId, periodStart, periodEnd);

    if (created) {
      console.log(`[BillingWorker] Created invoice ${invoice.invoiceNumber} for subscription ${subscriptionId}`);
    } else {
      console.log(`[BillingWorker] Invoice already exists for this period. Skipping creation.`);
    }

    // Advance the billing period regardless (idempotent on next run)
    const nextPeriodStart = new Date(periodEnd);
    nextPeriodStart.setDate(nextPeriodStart.getDate() + 1);
    const nextPeriodEnd = computePeriodEnd(nextPeriodStart, subscription.billingFrequency);
    const nextBillingDate = new Date(nextPeriodEnd);
    nextBillingDate.setDate(nextBillingDate.getDate() + 1);

    if (subscription.autoRenew) {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          currentPeriodStart: nextPeriodStart,
          currentPeriodEnd: nextPeriodEnd,
          nextBillingDate,
        },
      });
      console.log(`[BillingWorker] Subscription ${subscriptionId} period advanced to ${nextBillingDate.toISOString()}`);
    } else {
      // No auto-renew — close subscription after this period
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          nextBillingDate: null,
        },
      });
      console.log(`[BillingWorker] Subscription ${subscriptionId} closed (auto-renew disabled).`);
    }

    return { invoiceId: invoice.id, created };
  },
  { connection, concurrency: 5 }
);

// ─── Overdue Worker ───────────────────────────────────────────────────────────

const overdueWorker = new Worker(
  'overdue',
  async (_job) => {
    console.log('[OverdueWorker] Marking overdue invoices...');
    const count = await markOverdueInvoices();
    console.log(`[OverdueWorker] Marked ${count} invoice(s) as OVERDUE`);
    return { markedOverdue: count };
  },
  { connection }
);

// ─── Recurring Billing Scheduler ──────────────────────────────────────────────
// On startup, enqueue billing jobs for all ACTIVE subscriptions due today or earlier

async function enqueueDueSubscriptions() {
  const now = new Date();
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      nextBillingDate: { lte: now },
    },
    select: { id: true, nextBillingDate: true },
  });

  console.log(`[Scheduler] Found ${dueSubscriptions.length} subscription(s) due for billing`);

  const { billingQueue } = await import('./queues/billing.queue.js');
  for (const sub of dueSubscriptions) {
    await billingQueue.add(
      'generate-invoice',
      { subscriptionId: sub.id },
      {
        jobId: `billing-${sub.id}-${sub.nextBillingDate?.toISOString()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }
    );
  }
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

billingWorker.on('completed', (job, result) => {
  console.log(`[BillingWorker] Job ${job.id} completed`, result);
});

billingWorker.on('failed', (job, err) => {
  console.error(`[BillingWorker] Job ${job?.id} failed:`, err.message);
});

overdueWorker.on('completed', (job, result) => {
  console.log(`[OverdueWorker] Job ${job.id} completed`, result);
});

overdueWorker.on('failed', (job, err) => {
  console.error(`[OverdueWorker] Job ${job?.id} failed:`, err.message);
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown() {
  console.log('[Worker] Graceful shutdown initiated...');
  await billingWorker.close();
  await overdueWorker.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// ─── Startup ──────────────────────────────────────────────────────────────────

console.log(`[Brightloop Worker] Starting... Redis: ${env.REDIS_URL}`);

enqueueDueSubscriptions().catch((err) => {
  console.error('[Scheduler] Failed to enqueue due subscriptions on startup:', err.message);
});
