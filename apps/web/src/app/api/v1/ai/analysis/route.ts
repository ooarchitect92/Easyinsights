import { aiAnalysisRequestSchema } from '@easyinsights/contracts';
import { modelAssignment, routeReadiness } from '@easyinsights/ai';
import {
  appendAudit,
  config,
  enqueueEvent,
  opaqueToken,
  retentionDate,
  tenantFilter,
} from '@easyinsights/core';
import { ApiError, handleApi, idempotency, parseBody } from '@/server/api';

async function workspaceEvidence(db: any, scope: any) {
  const filter = tenantFilter(scope);
  const [campaigns, profiles, events, findings] = await Promise.all([
    db
      .collection('campaigns')
      .find(filter)
      .project({ _id: 0, id: 1, name: 1, channel: 1, spend: 1, revenue: 1, conversions: 1 })
      .limit(100)
      .toArray(),
    db.collection('customer_profiles').countDocuments(filter),
    db.collection('canonical_events').countDocuments(filter),
    db.collection('quality_findings').countDocuments({ ...filter, status: 'open' }),
  ]);
  const spend = campaigns.reduce((sum: number, row: any) => sum + Number(row.spend || 0), 0);
  const revenue = campaigns.reduce((sum: number, row: any) => sum + Number(row.revenue || 0), 0);
  return {
    snapshotId: 'ais_' + opaqueToken(12),
    capturedAt: new Date().toISOString(),
    profileCount: profiles,
    eventCount: events,
    openQualityFindings: findings,
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : null,
    campaigns,
  };
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, aiAnalysisRequestSchema);
      const key = request.headers.get('idempotency-key')?.trim();
      if (!key || key.length < 8 || key.length > 180) {
        throw new ApiError(
          400,
          'IDEMPOTENCY_KEY_REQUIRED',
          'A stable Idempotency-Key header between 8 and 180 characters is required.',
        );
      }
      const assignment = modelAssignment(input.task);
      const readiness = routeReadiness(input.task);
      const evidence = await workspaceEvidence(db, principal.tenant);
      const result = await idempotency(
        db,
        principal.tenant,
        'ai-analysis:' + key,
        async (session) => {
          const jobId = 'aij_' + opaqueToken(12);
          const reservationId = 'aiur_' + opaqueToken(12);
          const now = new Date();
          await db.collection('ai_jobs').insertOne(
            {
              id: jobId,
              ...principal.tenant,
              task: input.task,
              provider: assignment.provider,
              requestedModel: assignment.requestedIdentifier,
              resolvedModel: null,
              status: 'queued',
              attempt: 0,
              fencingToken: 0,
              correlationId: requestId,
              inputSnapshot: { prompt: input.prompt, context: input.context, evidence },
              sourceSnapshotId: evidence.snapshotId,
              schemaVersion: 'ai-job-v1',
              promptVersion: 'analyst-v1',
              readinessAtSubmission: readiness,
              createdBy: principal.userId,
              createdAt: now,
              updatedAt: now,
              expiresAt: retentionDate(config.runTtlDays),
            },
            { session },
          );
          await db.collection('ai_usage_reservations').insertOne(
            {
              id: reservationId,
              ...principal.tenant,
              jobId,
              task: input.task,
              status: 'reserved',
              budgetClass: 'interactive_analysis',
              createdAt: now,
              expiresAt: retentionDate(config.runTtlDays),
            },
            { session },
          );
          await enqueueEvent(
            db,
            {
              topic: 'easyinsights.commands.ai',
              key: jobId,
              type: 'ai.job.requested',
              scope: principal.tenant,
              payload: { jobId },
              actorId: principal.userId,
              correlationId: requestId,
            },
            session,
          );
          await appendAudit(db, {
            scope: principal.tenant,
            actorId: principal.userId,
            action: 'ai.analysis.request',
            resourceType: 'ai_job',
            resourceId: jobId,
            requestId,
            metadata: {
              task: input.task,
              requestedModel: assignment.requestedIdentifier,
              servingReady: readiness.servingReady,
              idempotencyKeyPresent: true,
            },
            session,
          });
          return {
            jobId,
            status: 'queued',
            task: input.task,
            requestedModel: assignment.requestedIdentifier,
            servingReady: readiness.servingReady,
            readiness: readiness.state,
          };
        },
      );
      return { ...result.value, replayed: result.replayed };
    },
    { permission: 'ai:run' },
  );
}
