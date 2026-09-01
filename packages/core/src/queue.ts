import type { ClientSession, Db, Document } from 'mongodb';
import type { TenantScope } from '@easyinsights/contracts';
import { opaqueToken } from './platform.js';
import { config, retentionDate } from './config.js';
export interface RuntimeEventInput {
  topic: string;
  key: string;
  type: string;
  scope: TenantScope;
  payload: Record<string, unknown>;
  actorId: string;
  correlationId?: string;
  causationId?: string;
  deliveryAttempt?: number;
  availableAt?: Date;
}
export interface OutboxDocument extends Document {
  id: string;
  topic: string;
  key: string;
  type: string;
  organizationId: string;
  workspaceId: string;
  payload: Record<string, unknown>;
  actorId: string;
  correlationId: string;
  causationId?: string;
  deliveryAttempt: number;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  attempts: number;
  availableAt: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lockedUntil?: Date;
  publishedAt?: Date;
  lastError?: string;
}
export function prefixedId(prefix: string): string {
  return `${prefix}_${opaqueToken(12)}`;
}
export async function enqueueEvent(
  db: Db,
  input: RuntimeEventInput,
  session?: ClientSession,
): Promise<string> {
  const now = new Date();
  const id = prefixedId('out');
  const doc: OutboxDocument = {
    id,
    topic: input.topic,
    key: input.key,
    type: input.type,
    ...input.scope,
    payload: input.payload,
    actorId: input.actorId,
    correlationId: input.correlationId ?? id,
    deliveryAttempt: input.deliveryAttempt ?? 0,
    status: 'pending',
    attempts: 0,
    availableAt: input.availableAt ?? now,
    createdAt: now,
    updatedAt: now,
    expiresAt: retentionDate(config.outboxTtlDays),
  };
  if (input.causationId !== undefined) doc.causationId = input.causationId;
  await db.collection<OutboxDocument>('outbox').insertOne(doc, session ? { session } : undefined);
  return id;
}
