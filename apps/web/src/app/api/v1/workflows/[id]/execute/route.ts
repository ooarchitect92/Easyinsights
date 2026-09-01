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
  trigger: z.record(z.unknown()).default({ type: 'manual' }),
  dryRun: z.boolean().default(true),
});
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, schema);
      return withTransaction(async (db, session) => {
        const workflow = await db
          .collection('workflows')
          .findOne(
            { ...tenantFilter(principal.tenant), id, status: { $in: ['published', 'draft'] } },
            { session },
          );
        if (!workflow) throw new ApiError(404, 'NOT_FOUND', 'Workflow was not found.');
        const runId = `wrun_${opaqueToken(12)}`;
        const now = new Date();
        await db
          .collection('workflow_runs')
          .insertOne(
            {
              id: runId,
              ...principal.tenant,
              workflowId: id,
              name: workflow.name,
              workflowVersion: workflow.version ?? 1,
              trigger: input.trigger,
              dryRun: input.dryRun,
              status: 'queued',
              currentNodeIds: [],
              completedNodeIds: [],
              attempt: 0,
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
            topic: 'easyinsights.commands.workflow',
            key: runId,
            type: 'workflow.execute.requested',
            scope: principal.tenant,
            payload: { runId },
            actorId: principal.userId,
            correlationId: requestId,
          },
          session,
        );
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: 'workflow.execute.request',
          resourceType: 'workflow_run',
          resourceId: runId,
          requestId,
          metadata: { dryRun: input.dryRun },
          session,
        });
        return { runId, status: 'queued', dryRun: input.dryRun };
      });
    },
    { permission: 'workflow:write' },
  );
}
