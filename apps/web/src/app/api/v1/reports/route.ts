import { reportSchema } from '@easyinsights/contracts';
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
          .collection('reports')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'report:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, reportSchema);
      return withTransaction(async (db, session) => {
        const id = `rep_${opaqueToken(12)}`;
        const now = new Date();
        await db
          .collection('reports')
          .insertOne(
            {
              id,
              ...principal.tenant,
              ...input,
              status: 'queued',
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
            topic: 'easyinsights.commands.report',
            key: id,
            type: 'report.generate.requested',
            scope: principal.tenant,
            payload: { reportId: id },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'report.generate.request',
          resourceType: 'report',
          resourceId: id,
          requestId,
          session,
        });
        return { id, status: 'queued' };
      });
    },
    { permission: 'report:write' },
  );
}
