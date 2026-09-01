import {
  config,
  enqueueEvent,
  getDb,
  opaqueToken,
  retentionDate,
  withTransaction,
} from '@easyinsights/core';
import { createConsumer, topics } from './kafka.js';
import { log } from './log.js';
import { parseRuntimeMessage, type RuntimeMessage } from './message.js';
import { dispatch } from './handlers/index.js';
const maxAttempts = 5;
async function persistFailure(message: RuntimeMessage, error: unknown): Promise<void> {
  const detail = error instanceof Error ? error.message : String(error);
  const nextAttempt = message.attempt + 1;
  await withTransaction(async (db, session) => {
    await db.collection('message_failures').insertOne(
      {
        id: `mfail_${opaqueToken(12)}`,
        ...message.scope,
        messageId: message.id,
        type: message.type,
        attempt: nextAttempt,
        error: detail.slice(0, 4000),
        createdAt: new Date(),
        expiresAt: retentionDate(config.runTtlDays),
      },
      { session },
    );
    if (nextAttempt >= maxAttempts) {
      await db.collection('dead_letters').insertOne(
        {
          id: `dlq_${opaqueToken(12)}`,
          ...message.scope,
          message,
          error: detail.slice(0, 8000),
          attempt: nextAttempt,
          status: 'open',
          createdAt: new Date(),
          expiresAt: retentionDate(config.runTtlDays),
        },
        { session },
      );
      await enqueueEvent(
        db,
        {
          topic: 'easyinsights.dead-letter',
          key: message.key,
          type: 'message.dead_lettered',
          scope: message.scope,
          payload: {
            failedMessageId: message.id,
            failedType: message.type,
            error: detail.slice(0, 2000),
          },
          actorId: 'system:consumer',
          correlationId: message.correlationId,
          causationId: message.id,
          deliveryAttempt: nextAttempt,
        },
        session,
      );
      return;
    }
    const delay = Math.min(5 * 60 * 1000, 2 ** nextAttempt * 1000);
    await enqueueEvent(
      db,
      {
        topic: message.topic,
        key: message.key,
        type: message.type,
        scope: message.scope,
        payload: message.payload,
        actorId: message.actorId,
        correlationId: message.correlationId,
        causationId: message.id,
        deliveryAttempt: nextAttempt,
        availableAt: new Date(Date.now() + delay),
      },
      session,
    );
  });
  log('warn', 'message scheduled for retry', {
    messageId: message.id,
    type: message.type,
    attempt: nextAttempt,
    error: detail,
  });
}
export async function runConsumer(signal: AbortSignal): Promise<void> {
  const consumer = await createConsumer();
  for (const topic of topics.filter((value) => value !== 'easyinsights.dead-letter'))
    await consumer.subscribe({ topic, fromBeginning: false });
  log('info', 'consumer started', { groupId: config.kafkaGroupId });
  const stop = async () => consumer.stop().catch(() => undefined);
  signal.addEventListener(
    'abort',
    () => {
      void stop();
    },
    { once: true },
  );
  try {
    await consumer.run({
      partitionsConsumedConcurrently: 3,
      eachMessage: async ({ topic, partition, message }) => {
        let runtime: RuntimeMessage;
        try {
          runtime = parseRuntimeMessage(message.value);
        } catch (error) {
          const db = await getDb();
          await db.collection('dead_letters').insertOne({
            id: `dlq_${opaqueToken(12)}`,
            sourceTopic: topic,
            partition,
            offset: message.offset,
            rawValue: message.value?.toString('base64'),
            error: error instanceof Error ? error.message : String(error),
            status: 'open',
            createdAt: new Date(),
            expiresAt: retentionDate(config.runTtlDays),
          });
          log('error', 'invalid message moved to dead letter storage', {
            topic,
            partition,
            offset: message.offset,
          });
          return;
        }
        try {
          await withTransaction(async (db, session) => {
            const existing = await db
              .collection('processed_messages')
              .findOne({ messageId: runtime.id }, { session });
            if (existing) return;
            await dispatch(db, session, runtime);
            await db.collection('processed_messages').insertOne(
              {
                id: `pm_${opaqueToken(12)}`,
                ...runtime.scope,
                messageId: runtime.id,
                type: runtime.type,
                topic,
                partition,
                offset: message.offset,
                processedAt: new Date(),
                expiresAt: retentionDate(config.runTtlDays),
              },
              { session },
            );
          });
        } catch (error) {
          await persistFailure(runtime, error);
        }
      },
    });
  } finally {
    await consumer.disconnect();
    log('info', 'consumer stopped');
  }
}
