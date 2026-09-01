import { attributionRunSchema } from '@easyinsights/contracts';
import {
  appendAudit,
  config,
  enqueueEvent,
  opaqueToken,
  publicDocument,
  retentionDate,
  tenantFilter,
  withTransaction,
} from '@easyinsights/core';
import { handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('attribution_runs')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'measurement:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, attributionRunSchema);
      return withTransaction(async (db, session) => {
        const id = `atr_${opaqueToken(12)}`;
        const now = new Date();
        await db.collection('attribution_runs').insertOne(
          {
            id,
            ...principal.tenant,
            ...input,
            status: 'queued',
            modelVersion: 'attribution-v1',
            createdBy: principal.userId,
            createdAt: now,
            updatedAt: now,
            expiresAt: retentionDate(config.runTtlDays),
          },
          { session },
        );
        await enqueueEvent(
          db,
          {
            topic: 'easyinsights.commands.attribution',
            key: id,
            type: 'attribution.run.requested',
            scope: principal.tenant,
            payload: { runId: id },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'attribution.run.request',
          resourceType: 'attribution_run',
          resourceId: id,
          requestId,
          session,
        });
        return { id, status: 'queued' };
      });
    },
    { permission: 'measurement:write' },
  );
}
