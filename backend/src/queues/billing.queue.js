import { Queue } from 'bullmq';
import { env } from '../config/env.js';

const connection = { host: new URL(env.REDIS_URL).hostname, port: Number(new URL(env.REDIS_URL).port) || 6379 };

// Queue for recurring invoice generation
export const billingQueue = new Queue('billing', { connection });

// Queue for marking overdue invoices
export const overdueQueue = new Queue('overdue', { connection });

export async function scheduleBillingJob(subscriptionId, runAt) {
  await billingQueue.add(
    'generate-invoice',
    { subscriptionId },
    {
      jobId: `billing-${subscriptionId}-${runAt.toISOString()}`,
      delay: Math.max(0, runAt.getTime() - Date.now()),
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    }
  );
}

export async function scheduleOverdueCheck() {
  await overdueQueue.add('mark-overdue', {}, {
    repeat: { pattern: '0 2 * * *' }, // daily at 02:00 UTC
    attempts: 3,
  });
}
