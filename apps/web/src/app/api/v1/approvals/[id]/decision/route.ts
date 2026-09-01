import { approvalDecisionSchema } from '@easyinsights/contracts';
import { appendAudit, enqueueEvent, tenantFilter, withTransaction } from '@easyinsights/core';
import { ApiError, handleApi, parseBody } from '@/server/api';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ requestId, principal }) => {
      const input = await parseBody(request, approvalDecisionSchema);
      return withTransaction(async (db, session) => {
        const approval = await db
          .collection('approvals')
          .findOne({ ...tenantFilter(principal.tenant), id, status: 'pending' }, { session });
        if (!approval) throw new ApiError(404, 'NOT_FOUND', 'Pending approval not found.');
        if (approval.riskLevel === 'high' && approval.requestedBy === principal.userId)
          throw new ApiError(
            409,
            'FOUR_EYES_REQUIRED',
            'The requester cannot approve or reject their own high-risk action.',
          );
        const now = new Date();
        const update = await db.collection('approvals').updateOne(
          { ...tenantFilter(principal.tenant), id, status: 'pending' },
          {
            $set: {
              status: input.decision,
              decisionReason: input.reason,
              decidedBy: principal.userId,
              decidedAt: now,
              updatedAt: now,
            },
          },
          { session },
        );
        if (update.modifiedCount !== 1)
          throw new ApiError(
            409,
            'APPROVAL_ALREADY_DECIDED',
            'The approval was decided by another user.',
          );
        if (input.decision === 'approved') {
          const type = String(approval.targetType);
          const topic =
            type === 'activation'
              ? 'easyinsights.commands.activation'
              : type === 'workflow'
                ? 'easyinsights.commands.workflow'
                : 'easyinsights.commands.agent';
          const eventType =
            type === 'activation'
              ? 'activation.execute.requested'
              : type === 'workflow'
                ? 'workflow.resume.requested'
                : 'agent.action.approved';
          await enqueueEvent(
            db,
            {
              topic,
              key: String(approval.targetId),
              type: eventType,
              scope: principal.tenant,
              payload: { runId: approval.targetId, approvalId: id },
              actorId: principal.userId,
              correlationId: requestId,
            },
            session,
          );
        } else {
          const collection =
            approval.targetType === 'activation'
              ? 'activation_runs'
              : approval.targetType === 'workflow'
                ? 'workflow_runs'
                : 'agent_runs';
          await db
            .collection(collection)
            .updateOne(
              { ...tenantFilter(principal.tenant), id: approval.targetId },
              { $set: { status: 'rejected', updatedAt: now, rejectionReason: input.reason } },
              { session },
            );
        }
        await appendAudit(db, {
          scope: principal.tenant,
          actorId: principal.userId,
          action: `approval.${input.decision}`,
          resourceType: 'approval',
          resourceId: id,
          requestId,
          metadata: { targetType: approval.targetType, targetId: approval.targetId },
          session,
        });
        return { id, status: input.decision, decidedAt: now };
      });
    },
    { permission: 'approval:decide' },
  );
}
