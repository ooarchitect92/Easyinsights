import { canonicalEventSchema } from '@easyinsights/contracts';
import {
  appendAudit,
  config,
  enqueueEvent,
  getCache,
  normalizeEmail,
  normalizePhone,
  opaqueToken,
  retentionDate,
  sha256,
} from '@easyinsights/core';
import { handleApi, idempotency, parseBody, ApiError } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('canonical_events')
          .find({ ...principal.tenant })
          .sort({ eventTime: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => {
        const { _id, ...rest } = doc;
        return rest;
      }),
    { permission: 'event:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, canonicalEventSchema);
      const key = request.headers.get('idempotency-key') ?? input.eventId;
      if (key.length < 8)
        throw new ApiError(
          400,
          'IDEMPOTENCY_REQUIRED',
          'An idempotency key of at least 8 characters is required.',
        );
      const result = await idempotency(db, principal.tenant, key, async (session) => {
        const now = new Date();
        const rawId = `raw_${opaqueToken(12)}`;
        const canonicalId = `evt_${opaqueToken(12)}`;
        const identifiers = {
          ...(input.identifiers.email
            ? { emailHash: sha256(normalizeEmail(input.identifiers.email)) }
            : {}),
          ...(input.identifiers.phone
            ? { phoneHash: sha256(normalizePhone(input.identifiers.phone)) }
            : {}),
          ...(input.identifiers.externalId ? { externalId: input.identifiers.externalId } : {}),
        };
        await db.collection('raw_events').insertOne(
          {
            id: rawId,
            ...principal.tenant,
            source: input.source,
            receivedAt: now,
            payload: input,
            transformationVersion: 'canonical-v1',
            expiresAt: retentionDate(config.rawEventTtlDays),
            dataClassification: 'restricted',
          },
          { session },
        );
        const event = {
          id: canonicalId,
          ...principal.tenant,
          eventId: input.eventId,
          eventName: input.eventName,
          eventTime: input.eventTime,
          anonymousId: input.anonymousId,
          customerId: input.customerId,
          source: input.source,
          campaign: input.campaign,
          properties: input.properties,
          context: input.context,
          identifiers,
          consent: input.consent,
          rawEventId: rawId,
          transformationVersion: 'canonical-v1',
          processingStatus: 'queued',
          createdAt: now,
          dataClassification: 'confidential',
        };
        await db.collection('canonical_events').insertOne(event, { session });
        await db.collection('usage_events').insertOne(
          {
            id: `use_${opaqueToken(12)}`,
            ...principal.tenant,
            metric: 'events',
            quantity: 1,
            occurredAt: now,
            createdAt: now,
          },
          { session },
        );
        await enqueueEvent(
          db,
          {
            topic: 'easyinsights.events.canonical',
            key: input.customerId ?? input.anonymousId ?? input.eventId,
            type: 'canonical.event.created',
            scope: principal.tenant,
            payload: { eventId: canonicalId },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'event.ingest',
          resourceType: 'canonical_event',
          resourceId: canonicalId,
          requestId,
          metadata: { eventName: input.eventName, source: input.source },
          session,
        });
        return { id: canonicalId, eventId: input.eventId, status: 'queued' };
      });
      await getCache().invalidatePrefix(
        `dashboard:${principal.tenant.organizationId}:${principal.tenant.workspaceId}`,
      );
      return { ...result.value, replayed: result.replayed };
    },
    { permission: 'event:write', rateBucket: 'event-ingest' },
  );
}
