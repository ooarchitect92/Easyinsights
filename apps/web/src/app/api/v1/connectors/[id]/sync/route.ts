import {
  appendAudit,
  config,
  enqueueEvent,
  opaqueToken,
  retentionDate,
  tenantFilter,
  withTransaction,
} from '@easyinsights/core';
import { ApiError, handleApi } from '@/server/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ requestId, principal }) =>
      withTransaction(async (db, session) => {
        const connector = await db
          .collection('connectors')
          .findOne({ ...tenantFilter(principal.tenant), id }, { session });
        if (!connector) throw new ApiError(404, 'NOT_FOUND', 'Connector not found.');
        const runId = `crun_${opaqueToken(12)}`;
        const now = new Date();
        await db
          .collection('connector_runs')
          .insertOne(
            {
              id: runId,
              ...principal.tenant,
              connectorId: id,
              name: connector.name,
              status: 'queued',
              attempt: 0,
              createdAt: now,
              updatedAt: now,
              expiresAt: retentionDate(config.runTtlDays),
            },
            { session },
          );
        await enqueueEvent(
          db,
          {
            topic: 'easyinsights.commands.connector',
            key: id,
            type: 'connector.sync.requested',
            scope: principal.tenant,
            payload: { runId, connectorId: id },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'connector.sync.request',
          resourceType: 'connector_run',
          resourceId: runId,
          requestId,
          session,
        });
        return { runId, status: 'queued' };
      }),
    { permission: 'connector:write' },
  );
}
