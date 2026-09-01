import type { ClientSession, Db, Document } from 'mongodb';
import { config, opaqueToken, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
export async function handleWorkflow(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const scope = tenantFilter(message.scope);
  const run = await db.collection('workflow_runs').findOne({ ...scope, id: runId }, { session });
  if (!run) throw new Error('Workflow run not found');
  const workflow = await db
    .collection('workflows')
    .findOne({ ...scope, id: run.workflowId }, { session });
  if (!workflow) throw new Error('Workflow definition not found');
  const nodes = Array.isArray(workflow.nodes) ? (workflow.nodes as Document[]) : [];
  const completed = new Set(
    Array.isArray(run.completedNodeIds) ? (run.completedNodeIds as string[]) : [],
  );
  await markRun(db, session, 'workflow_runs', runId, 'processing', {
    startedAt: run.startedAt ?? new Date(),
    attempt: Number(run.attempt ?? 0) + 1,
  });
  const evidence = Array.isArray(run.evidence) ? (run.evidence as Document[]) : [];
  for (const node of nodes) {
    const nodeId = String(node.id);
    if (completed.has(nodeId)) continue;
    const type = String(node.type);
    const nodeEvidence: Document = {
      nodeId,
      type,
      name: node.name,
      startedAt: new Date(),
      status: 'completed',
    };
    if (type === 'approval' && run.dryRun !== true) {
      const existing = await db
        .collection('approvals')
        .findOne(
          { ...scope, targetType: 'workflow', targetId: runId, 'metadata.nodeId': nodeId },
          { session },
        );
      if (!existing) {
        const approvalId = `apr_${opaqueToken(12)}`;
        await db
          .collection('approvals')
          .insertOne(
            {
              id: approvalId,
              ...message.scope,
              title: `Approve workflow step: ${String(node.name)}`,
              targetType: 'workflow',
              targetId: runId,
              riskLevel: String(node.configuration?.riskLevel ?? 'high'),
              requestedBy: run.createdBy,
              predictedImpact: String(
                node.configuration?.predictedImpact ??
                  'Workflow action may change an external system.',
              ),
              evidence: { workflowId: workflow.id, runId, nodeId },
              rollbackPlan: String(
                node.configuration?.rollbackPlan ??
                  'Use the workflow-specific compensating action.',
              ),
              status: 'pending',
              metadata: { nodeId },
              createdAt: new Date(),
              updatedAt: new Date(),
              expiresAt: new Date(Date.now() + config.runTtlDays * 86400000),
            },
            { session },
          );
        await markRun(db, session, 'workflow_runs', runId, 'awaiting_approval', {
          approvalId,
          currentNodeIds: [nodeId],
          completedNodeIds: [...completed],
          evidence: [...evidence, { ...nodeEvidence, status: 'awaiting_approval' }],
        });
        return;
      }
      if (existing.status !== 'approved') {
        await markRun(
          db,
          session,
          'workflow_runs',
          runId,
          existing.status === 'rejected' ? 'rejected' : 'awaiting_approval',
          { approvalId: existing.id, currentNodeIds: [nodeId], completedNodeIds: [...completed] },
        );
        return;
      }
    }
    if (type === 'delay' && run.dryRun !== true) {
      nodeEvidence.simulated = true;
      nodeEvidence.note = 'Durable timed resumption is represented as evidence in the MVP worker.';
    }
    if (type === 'action') {
      nodeEvidence.mode = run.dryRun === true ? 'dry_run' : 'policy_checked';
      nodeEvidence.note =
        run.dryRun === true
          ? 'External action was simulated.'
          : 'External action requires a dedicated activation adapter.';
    }
    completed.add(nodeId);
    nodeEvidence.completedAt = new Date();
    evidence.push(nodeEvidence);
  }
  await markRun(db, session, 'workflow_runs', runId, 'completed', {
    completedAt: new Date(),
    currentNodeIds: [],
    completedNodeIds: [...completed],
    evidence,
  });
  await db
    .collection('workflows')
    .updateOne(
      { ...scope, id: workflow.id },
      { $set: { lastRunStatus: 'completed', lastRunAt: new Date(), updatedAt: new Date() } },
      { session },
    );
}
