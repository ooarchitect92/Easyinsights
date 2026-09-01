import { activationSchema } from '@easyinsights/contracts';
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
import { ApiError, handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('activation_runs')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'activation:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, activationSchema);
      return withTransaction(async (db, session) => {
        const connector = await db
          .collection('connectors')
          .findOne(
            {
              ...tenantFilter(principal.tenant),
              id: input.destinationConnectorId,
              direction: { $in: ['destination', 'bidirectional'] },
            },
            { session },
          );
        if (!connector)
          throw new ApiError(404, 'DESTINATION_NOT_FOUND', 'Destination connector not found.');
        const runId = `act_${opaqueToken(12)}`;
        const now = new Date();
        let status = 'queued';
        let approvalId: string | undefined;
        if (!input.dryRun) {
          approvalId = `apr_${opaqueToken(12)}`;
          status = 'awaiting_approval';
          await db
            .collection('approvals')
            .insertOne(
              {
                id: approvalId,
                ...principal.tenant,
                title: `Approve ${input.type} activation`,
                targetType: 'activation',
                targetId: runId,
                riskLevel: 'high',
                requestedBy: principal.userId,
                predictedImpact: 'External customer-data delivery',
                evidence: { destination: connector.provider, type: input.type },
                rollbackPlan: 'Destination-specific suppression or correction workflow',
                status: 'pending',
                createdAt: now,
                updatedAt: now,
                expiresAt: retentionDate(config.runTtlDays),
              },
              { session },
            );
        }
        await db
          .collection('activation_runs')
          .insertOne(
            {
              id: runId,
              ...principal.tenant,
              ...input,
              destinationProvider: connector.provider,
              status,
              approvalId,
              createdBy: principal.userId,
              createdAt: now,
              updatedAt: now,
              expiresAt: retentionDate(config.runTtlDays),
            },
            { session },
          );
        if (input.dryRun)
          await enqueueEvent(
            db,
            {
              topic: 'easyinsights.commands.activation',
              key: runId,
              type: 'activation.execute.requested',
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
          action: 'activation.request',
          resourceType: 'activation_run',
          resourceId: runId,
          requestId,
          metadata: { dryRun: input.dryRun, destination: connector.provider },
          session,
        });
        return { runId, status, approvalId };
      });
    },
    { permission: 'activation:write' },
  );
}
