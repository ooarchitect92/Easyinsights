import { aiForecastRequestSchema } from '@easyinsights/contracts';
import { modelAssignment, routeReadiness } from '@easyinsights/ai';
import { appendAudit, config, enqueueEvent, opaqueToken, retentionDate } from '@easyinsights/core';
import { ApiError, handleApi, idempotency, parseBody } from '@/server/api';

export async function POST(request: Request) {
  return handleApi(request, async ({ requestId, principal, db }) => {
    const input = await parseBody(request, aiForecastRequestSchema);
    const key = request.headers.get('idempotency-key')?.trim();
    if (!key || key.length < 8 || key.length > 180)
      throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'A stable Idempotency-Key header is required.');
    const assignment = modelAssignment(input.task);
    const readiness = routeReadiness(input.task);
    const result = await idempotency(db, principal.tenant, 'ai-forecast:' + key, async (session) => {
      const jobId = 'aij_' + opaqueToken(12);
      const now = new Date();
      await db.collection('ai_jobs').insertOne({
        id: jobId, ...principal.tenant, task: input.task, provider: assignment.provider,
        requestedModel: assignment.requestedIdentifier, status: 'queued', attempt: 0, fencingToken: 0,
        correlationId: requestId,
        inputSnapshot: { payload: { values: input.values, horizon: input.horizon, seasonLength: input.seasonLength } },
        sourceSnapshotId: 'inline_forecast_' + requestId, schemaVersion: 'ai-forecast-v1',
        readinessAtSubmission: readiness, createdBy: principal.userId, createdAt: now, updatedAt: now,
        expiresAt: retentionDate(config.runTtlDays),
      }, { session });
      await db.collection('ai_usage_reservations').insertOne({
        id: 'aiur_' + opaqueToken(12), ...principal.tenant, jobId, task: input.task,
        status: 'reserved', budgetClass: 'forecasting', createdAt: now,
        expiresAt: retentionDate(config.runTtlDays),
      }, { session });
      await enqueueEvent(db, {
        topic: 'easyinsights.commands.ai', key: jobId, type: 'ai.job.requested', scope: principal.tenant,
        payload: { jobId }, actorId: principal.userId, correlationId: requestId,
      }, session);
      await appendAudit(db, {
        scope: principal.tenant, actorId: principal.userId, action: 'ai.forecast.request',
        resourceType: 'ai_job', resourceId: jobId, requestId,
        metadata: { task: input.task, horizon: input.horizon, seasonLength: input.seasonLength }, session,
      });
      return { jobId, status: 'queued', task: input.task, requestedModel: assignment.requestedIdentifier };
    });
    return { ...result.value, replayed: result.replayed };
  }, { permission: 'ai:run' });
}
