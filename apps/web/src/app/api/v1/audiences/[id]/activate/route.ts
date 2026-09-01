import { z } from 'zod';
import {
  appendAudit,
  config,
  enqueueEvent,
  opaqueToken,
  retentionDate,
  tenantFilter,
  withTransaction,
} from '@easyinsights/core';
import { ApiError, handleApi, parseBody } from '@/server/api';
const schema = z.object({
  dryRun: z.boolean().default(true),
  destinationConnectorId: z.string().optional(),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, schema);
      return withTransaction(async (db, session) => {
        const audience = await db
          .collection('audiences')
          .findOne({ ...tenantFilter(principal.tenant), id }, { session });
        if (!audience) throw new ApiError(404, 'NOT_FOUND', 'Audience not found.');
        const runId = `arun_${opaqueToken(12)}`;
        const now = new Date();
        await db
          .collection('audience_runs')
          .insertOne(
            {
              id: runId,
              ...principal.tenant,
              audienceId: id,
              destinationConnectorId: input.destinationConnectorId,
              dryRun: input.dryRun,
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
            topic: 'easyinsights.commands.audience',
            key: id,
            type: 'audience.evaluate.requested',
            scope: principal.tenant,
            payload: {
              runId,
              audienceId: id,
              dryRun: input.dryRun,
              ...(input.destinationConnectorId
                ? { destinationConnectorId: input.destinationConnectorId }
                : {}),
            },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'audience.evaluate.request',
          resourceType: 'audience_run',
          resourceId: runId,
          requestId,
          metadata: { dryRun: input.dryRun },
          session,
        });
        return { runId, status: 'queued', dryRun: input.dryRun };
      });
    },
    { permission: 'audience:write' },
  );
}
