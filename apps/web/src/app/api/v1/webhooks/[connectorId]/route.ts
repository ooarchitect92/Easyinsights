import { createHmac, timingSafeEqual } from 'node:crypto';
import { canonicalEventSchema } from '@easyinsights/contracts';
import {
  appendAudit,
  config,
  enqueueEvent,
  normalizeEmail,
  normalizePhone,
  opaqueToken,
  retentionDate,
  sha256,
  withTransaction,
} from '@easyinsights/core';
import { ApiError, handlePublicApi } from '@/server/api';
function same(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ connectorId: string }> },
) {
  const { connectorId } = await params;
  return handlePublicApi(
    request,
    async ({ requestId, db }) => {
      const timestamp = request.headers.get('x-ei-timestamp');
      const signature = request.headers.get('x-ei-signature');
      if (!timestamp || !signature)
        throw new ApiError(401, 'SIGNATURE_REQUIRED', 'Signed webhook headers are required.');
      const numeric = Number(timestamp);
      if (!Number.isFinite(numeric) || Math.abs(Date.now() - numeric) > 5 * 60 * 1000)
        throw new ApiError(
          401,
          'STALE_SIGNATURE',
          'Webhook timestamp is outside the accepted window.',
        );
      const body = await request.text();
      const expected = createHmac('sha256', config.webhookSigningSecret)
        .update(`${timestamp}.${body}`)
        .digest('hex');
      if (!same(signature, expected))
        throw new ApiError(401, 'INVALID_SIGNATURE', 'Webhook signature is invalid.');
      const connector = await db
        .collection('connectors')
        .findOne({ id: connectorId, provider: 'webhook', status: { $in: ['healthy', 'active'] } });
      if (!connector)
        throw new ApiError(404, 'NOT_FOUND', 'Webhook connector was not found or is inactive.');
      const replayKey = sha256(`${connectorId}:${timestamp}:${signature}`);
      if (await db.collection('webhook_replays').findOne({ key: replayKey }))
        throw new ApiError(409, 'REPLAY_REJECTED', 'Webhook replay was rejected.');
      let unknown: unknown;
      try {
        unknown = JSON.parse(body);
      } catch {
        throw new ApiError(400, 'INVALID_JSON', 'Webhook body must be valid JSON.');
      }
      const parsed = canonicalEventSchema.safeParse(unknown);
      if (!parsed.success)
        throw new ApiError(
          422,
          'VALIDATION_ERROR',
          'Webhook event failed validation.',
          parsed.error.flatten(),
        );
      const input = parsed.data;
      const scope = {
        organizationId: String(connector.organizationId),
        workspaceId: String(connector.workspaceId),
      };
      return withTransaction(async (transactionDb, session) => {
        const now = new Date();
        await transactionDb.collection('webhook_replays').insertOne(
          {
            id: `wh_${opaqueToken(12)}`,
            key: replayKey,
            ...scope,
            createdAt: now,
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          },
          { session },
        );
        const rawId = `raw_${opaqueToken(12)}`;
        const canonicalId = `evt_${opaqueToken(12)}`;
        await transactionDb.collection('raw_events').insertOne(
          {
            id: rawId,
            ...scope,
            source: input.source,
            receivedAt: now,
            payload: input,
            transformationVersion: 'canonical-v1',
            expiresAt: retentionDate(config.rawEventTtlDays),
            dataClassification: 'restricted',
          },
          { session },
        );
        const identifiers = {
          ...(input.identifiers.email
            ? { emailHash: sha256(normalizeEmail(input.identifiers.email)) }
            : {}),
          ...(input.identifiers.phone
            ? { phoneHash: sha256(normalizePhone(input.identifiers.phone)) }
            : {}),
          ...(input.identifiers.externalId ? { externalId: input.identifiers.externalId } : {}),
        };
        await transactionDb.collection('canonical_events').insertOne(
          {
            id: canonicalId,
            ...scope,
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
          },
          { session },
        );
        await enqueueEvent(
          transactionDb,
          {
            topic: 'easyinsights.events.canonical',
            key: input.customerId ?? input.anonymousId ?? input.eventId,
            type: 'canonical.event.created',
            scope,
            payload: { eventId: canonicalId },
            actorId: `connector:${connectorId}`,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(transactionDb, {
          scope,
          actorId: `connector:${connectorId}`,
          action: 'webhook.ingest',
          resourceType: 'canonical_event',
          resourceId: canonicalId,
          requestId,
          session,
        });
        return { id: canonicalId, status: 'queued' };
      });
    },
    { csrf: false, rateBucket: `webhook:${connectorId}`, limit: 600 },
  );
}
