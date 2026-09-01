import type { OutboxDocument } from '@easyinsights/core';
export interface RuntimeMessage {
  id: string;
  topic: string;
  key: string;
  type: string;
  scope: { organizationId: string; workspaceId: string };
  payload: Record<string, unknown>;
  actorId: string;
  correlationId: string;
  causationId?: string;
  attempt: number;
  occurredAt: string;
}
export function fromOutbox(document: OutboxDocument): RuntimeMessage {
  return {
    id: document.id,
    topic: document.topic,
    key: document.key,
    type: document.type,
    scope: { organizationId: document.organizationId, workspaceId: document.workspaceId },
    payload: document.payload,
    actorId: document.actorId,
    correlationId: document.correlationId,
    ...(document.causationId ? { causationId: document.causationId } : {}),
    attempt: document.deliveryAttempt,
    occurredAt: document.createdAt.toISOString(),
  };
}
export function parseRuntimeMessage(value: Buffer | null): RuntimeMessage {
  if (!value) throw new Error('Kafka message value is empty');
  const parsed = JSON.parse(value.toString('utf8')) as Partial<RuntimeMessage>;
  if (
    !parsed.id ||
    !parsed.topic ||
    !parsed.key ||
    !parsed.type ||
    !parsed.scope?.organizationId ||
    !parsed.scope.workspaceId ||
    !parsed.payload ||
    !parsed.actorId ||
    !parsed.correlationId
  )
    throw new Error('Kafka message does not match the runtime envelope');
  return parsed as RuntimeMessage;
}
