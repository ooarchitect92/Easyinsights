import type { ClientSession, Db, Document } from 'mongodb';
import { config, opaqueToken, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
async function deterministicEvidence(db: Db, scope: Document, session: ClientSession) {
  const [campaigns, profiles, events, findings] = await Promise.all([
    db.collection('campaigns').find(scope, { session }).toArray(),
    db.collection('customer_profiles').countDocuments(scope, { session }),
    db.collection('canonical_events').countDocuments(scope, { session }),
    db.collection('quality_findings').countDocuments({ ...scope, status: 'open' }, { session }),
  ]);
  const spend = campaigns.reduce((sum, row) => sum + Number(row.spend ?? 0), 0);
  const revenue = campaigns.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const ranked = campaigns
    .map((row) => ({
      id: row.id,
      name: row.name,
      channel: row.channel,
      spend: Number(row.spend ?? 0),
      revenue: Number(row.revenue ?? 0),
      roas: Number(row.spend ?? 0) > 0 ? Number(row.revenue ?? 0) / Number(row.spend) : 0,
    }))
    .sort((a, b) => b.roas - a.roas);
  return {
    window: 'current_workspace_snapshot',
    campaignCount: campaigns.length,
    profileCount: profiles,
    eventCount: events,
    openQualityFindings: findings,
    spend,
    revenue,
    roas: spend > 0 ? revenue / spend : 0,
    topCampaigns: ranked.slice(0, 3),
  };
}
export async function handleAgent(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const scope = tenantFilter(message.scope);
  const run = await db.collection('agent_runs').findOne({ ...scope, id: runId }, { session });
  if (!run) throw new Error('Agent run not found');
  const agent = await db.collection('agents').findOne({ ...scope, id: run.agentId }, { session });
  if (!agent) throw new Error('Agent definition not found');
  await markRun(db, session, 'agent_runs', runId, 'processing', {
    startedAt: new Date(),
    attempt: Number(run.attempt ?? 0) + 1,
  });
  const evidence = await deterministicEvidence(db, scope, session);
  const confidence =
    evidence.eventCount >= Number(agent.policy?.minimumSampleSize ?? 1000)
      ? 0.92
      : evidence.eventCount > 0
        ? 0.7
        : 0.35;
  const recommendations = [] as Document[];
  if (evidence.openQualityFindings > 0)
    recommendations.push({
      priority: 1,
      title: 'Resolve open data-quality findings before increasing spend',
      reason: `${evidence.openQualityFindings} open findings can weaken attribution and destination signals.`,
      actionType: 'data_quality_review',
    });
  if (evidence.topCampaigns.length)
    recommendations.push({
      priority: 2,
      title: 'Protect high-performing campaign efficiency',
      reason: `${String(evidence.topCampaigns[0]?.name)} currently has the highest observed ROAS.`,
      actionType: 'campaign_review',
    });
  recommendations.push({
    priority: 3,
    title: 'Run a model comparison before budget reallocation',
    reason:
      'Compare first-touch, last-touch and linear attribution over the same conversion window.',
    actionType: 'attribution_run',
  });
  const result = {
    provider: 'deterministic_analytics',
    modelVersion: 'agent-analytics-v1',
    prompt: run.prompt,
    summary: `Workspace snapshot: ${evidence.eventCount} events, ${evidence.profileCount} profiles, ${evidence.campaignCount} campaigns and ${evidence.openQualityFindings} open quality findings.`,
    evidence,
    recommendations,
    confidence,
    reasoningSummary:
      'Recommendations are derived from stored aggregate metrics and explicit rules; no hidden autonomous provider action was executed.',
  };
  let status = 'completed';
  let approvalId: string | undefined;
  if (run.requestedAction && run.dryRun !== true && agent.autonomy !== 'advisory') {
    approvalId = `apr_${opaqueToken(12)}`;
    status = 'awaiting_approval';
    await db
      .collection('approvals')
      .insertOne(
        {
          id: approvalId,
          ...message.scope,
          title: `Approve agent action: ${String(agent.name)}`,
          targetType: 'agent',
          targetId: runId,
          riskLevel: 'high',
          requestedBy: run.createdBy,
          predictedImpact: 'Agent-requested external or campaign action',
          evidence: { result, requestedAction: run.requestedAction },
          rollbackPlan:
            'Use the destination-specific compensating operation recorded by the action adapter.',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
          expiresAt: new Date(Date.now() + config.runTtlDays * 86400000),
        },
        { session },
      );
  }
  await markRun(db, session, 'agent_runs', runId, status, {
    completedAt: status === 'completed' ? new Date() : undefined,
    result,
    confidence,
    approvalId,
  });
  await db
    .collection('agents')
    .updateOne(
      { ...scope, id: agent.id },
      { $set: { lastRunStatus: status, lastRunAt: new Date(), updatedAt: new Date() } },
      { session },
    );
}
