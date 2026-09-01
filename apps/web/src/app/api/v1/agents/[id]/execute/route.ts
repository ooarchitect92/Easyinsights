import { agentExecuteSchema } from '@easyinsights/contracts';
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
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, agentExecuteSchema);
      return withTransaction(async (db, session) => {
        const agent = await db
          .collection('agents')
          .findOne({ ...tenantFilter(principal.tenant), id, enabled: true }, { session });
        if (!agent) throw new ApiError(404, 'NOT_FOUND', 'Enabled agent not found.');
        const runId = `agrun_${opaqueToken(12)}`;
        const now = new Date();
        await db.collection('agent_runs').insertOne(
          {
            id: runId,
            ...principal.tenant,
            agentId: id,
            name: agent.name,
            agentType: agent.type,
            agentVersion: agent.version ?? 1,
            autonomy: agent.autonomy,
            prompt: input.prompt,
            context: input.context,
            requestedAction: input.requestedAction,
            dryRun: input.dryRun,
            status: 'queued',
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
            topic: 'easyinsights.commands.agent',
            key: runId,
            type: 'agent.execute.requested',
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
          action: 'agent.execute.request',
          resourceType: 'agent_run',
          resourceId: runId,
          requestId,
          metadata: { dryRun: input.dryRun, autonomy: agent.autonomy },
          session,
        });
        return { runId, status: 'queued', dryRun: input.dryRun };
      });
    },
    { permission: 'agent:execute' },
  );
}
