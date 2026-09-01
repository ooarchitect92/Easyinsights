import type { OutboxDocument } from '@easyinsights/core';
import { getDb } from '@easyinsights/core';
import { createProducer } from './kafka.js';
import { log } from './log.js';
import { fromOutbox } from './message.js';
const idleMs = 300;
const leaseMs = 30000;
export async function runOutbox(signal: AbortSignal): Promise<void> {
  const db = await getDb();
  const collection = db.collection<OutboxDocument>('outbox');
  const producer = await createProducer('outbox');
  log('info', 'outbox worker started');
  try {
    while (!signal.aborted) {
      const now = new Date();
      const claimed = await collection.findOneAndUpdate(
        {
          status: { $in: ['pending', 'failed'] },
          availableAt: { $lte: now },
          $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }],
        },
        {
          $set: {
            status: 'publishing',
            lockedUntil: new Date(now.getTime() + leaseMs),
            updatedAt: now,
          },
          $inc: { attempts: 1 },
        },
        { sort: { createdAt: 1 }, returnDocument: 'after' },
      );
      if (!claimed) {
        await new Promise((resolve) => setTimeout(resolve, idleMs));
        continue;
      }
      try {
        const message = fromOutbox(claimed);
        await producer.send({
          topic: claimed.topic,
          acks: -1,
          messages: [
            {
              key: claimed.key,
              value: JSON.stringify(message),
              headers: { type: claimed.type, correlationId: claimed.correlationId },
            },
          ],
        });
        await collection.updateOne(
          { id: claimed.id, status: 'publishing' },
          {
            $set: { status: 'published', publishedAt: new Date(), updatedAt: new Date() },
            $unset: { lockedUntil: '' },
          },
        );
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        const delay = Math.min(60000, Math.max(1000, 2 ** Math.min(claimed.attempts, 6) * 1000));
        await collection.updateOne(
          { id: claimed.id },
          {
            $set: {
              status: 'failed',
              lastError: text.slice(0, 2000),
              availableAt: new Date(Date.now() + delay),
              updatedAt: new Date(),
            },
            $unset: { lockedUntil: '' },
          },
        );
        log('error', 'outbox publish failed', { outboxId: claimed.id, error: text });
      }
    }
  } finally {
    await producer.disconnect();
    log('info', 'outbox worker stopped');
  }
}
