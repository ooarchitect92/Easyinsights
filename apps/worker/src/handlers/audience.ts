import type { ClientSession, Db, Document } from 'mongodb';
import type { AudienceRule } from '@easyinsights/contracts';
import { config, enqueueEvent, opaqueToken, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
function readPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, key) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[key]
          : undefined,
      value,
    );
}
export function evaluateRule(rule: AudienceRule, profile: Record<string, unknown>): boolean {
  if ('combinator' in rule)
    return rule.combinator === 'and'
      ? rule.rules.every((r) => evaluateRule(r, profile))
      : rule.rules.some((r) => evaluateRule(r, profile));
  const actual = readPath(profile, rule.field);
  switch (rule.operator) {
    case 'eq':
      return actual === rule.value;
    case 'neq':
      return actual !== rule.value;
    case 'gt':
      return Number(actual) > Number(rule.value);
    case 'gte':
      return Number(actual) >= Number(rule.value);
    case 'lt':
      return Number(actual) < Number(rule.value);
    case 'lte':
      return Number(actual) <= Number(rule.value);
    case 'contains':
      return (
        typeof actual === 'string' &&
        actual.toLowerCase().includes(String(rule.value).toLowerCase())
      );
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(actual);
    case 'exists':
      return actual !== undefined && actual !== null;
  }
}
export async function handleAudience(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const audienceId = requiredString(message.payload.audienceId, 'audienceId');
  const scope = tenantFilter(message.scope);
  const [run, audience] = await Promise.all([
    db.collection('audience_runs').findOne({ ...scope, id: runId }, { session }),
    db.collection('audiences').findOne({ ...scope, id: audienceId }, { session }),
  ]);
  if (!run || !audience) throw new Error('Audience or audience run was not found');
  await markRun(db, session, 'audience_runs', runId, 'processing', { startedAt: new Date() });
  const profiles = await db
    .collection('customer_profiles')
    .find(scope, { session })
    .limit(100000)
    .toArray();
  const matched = profiles.filter((profile) =>
    evaluateRule(audience.rule as AudienceRule, profile as Record<string, unknown>),
  );
  const eligible = matched.filter(
    (profile) =>
      audience.requireAdvertisingConsent !== true ||
      (profile.consent as Document | undefined)?.advertising === true,
  );
  const now = new Date();
  await db.collection('audience_memberships').deleteMany({ ...scope, audienceId }, { session });
  if (matched.length)
    await db.collection('audience_memberships').insertMany(
      matched.map((profile) => ({
        id: `aum_${opaqueToken(12)}`,
        ...message.scope,
        audienceId,
        profileId: profile.id,
        eligible: eligible.some((candidate) => candidate.id === profile.id),
        evaluatedAt: now,
        expiresAt: new Date(now.getTime() + config.runTtlDays * 86400000),
      })),
      { session },
    );
  await db
    .collection('audiences')
    .updateOne(
      { ...scope, id: audienceId },
      {
        $set: {
          status: 'active',
          memberCount: matched.length,
          eligibleCount: eligible.length,
          lastEvaluatedAt: now,
          updatedAt: now,
        },
      },
      { session },
    );
  await markRun(db, session, 'audience_runs', runId, 'completed', {
    completedAt: now,
    memberCount: matched.length,
    eligibleCount: eligible.length,
    excludedCount: matched.length - eligible.length,
  });
  if (run.dryRun !== true && run.destinationConnectorId) {
    const activationId = `act_${opaqueToken(12)}`;
    await db
      .collection('activation_runs')
      .insertOne(
        {
          id: activationId,
          ...message.scope,
          type: 'audience_sync',
          destinationConnectorId: run.destinationConnectorId,
          payload: { audienceId, profileIds: eligible.map((profile) => profile.id) },
          dryRun: false,
          idempotencyKey: `audience:${audienceId}:${now.toISOString()}`,
          status: 'awaiting_approval',
          createdBy: message.actorId,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + config.runTtlDays * 86400000),
        },
        { session },
      );
    const approvalId = `apr_${opaqueToken(12)}`;
    await db
      .collection('approvals')
      .insertOne(
        {
          id: approvalId,
          ...message.scope,
          title: `Approve audience sync: ${String(audience.name)}`,
          targetType: 'activation',
          targetId: activationId,
          riskLevel: 'high',
          requestedBy: message.actorId,
          predictedImpact: `${eligible.length} customer profiles may be sent to an external destination`,
          evidence: {
            audienceId,
            eligibleCount: eligible.length,
            excludedCount: matched.length - eligible.length,
          },
          rollbackPlan: 'Remove or suppress the synchronized audience at the destination.',
          status: 'pending',
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + config.runTtlDays * 86400000),
        },
        { session },
      );
    await db
      .collection('activation_runs')
      .updateOne({ id: activationId }, { $set: { approvalId } }, { session });
  }
}
