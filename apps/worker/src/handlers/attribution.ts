import type { ClientSession, Db, Document } from 'mongodb';
import { opaqueToken, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
export function attributionWeights(model: string, count: number): number[] {
  if (count <= 0) return [];
  if (model === 'first_touch') return Array.from({ length: count }, (_, i) => (i === 0 ? 1 : 0));
  if (model === 'last_touch' || model === 'last_non_direct')
    return Array.from({ length: count }, (_, i) => (i === count - 1 ? 1 : 0));
  if (model === 'position_based' && count > 1) {
    if (count === 2) return [0.5, 0.5];
    const middle = 0.2 / (count - 2);
    return Array.from({ length: count }, (_, i) => (i === 0 || i === count - 1 ? 0.4 : middle));
  }
  if (model === 'time_decay') {
    const raw = Array.from({ length: count }, (_, i) => 2 ** i);
    const sum = raw.reduce((a, b) => a + b, 0);
    return raw.map((v) => v / sum);
  }
  return Array.from({ length: count }, () => 1 / count);
}
export async function handleAttribution(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const scope = tenantFilter(message.scope);
  const run = await db.collection('attribution_runs').findOne({ ...scope, id: runId }, { session });
  if (!run) throw new Error('Attribution run not found');
  await markRun(db, session, 'attribution_runs', runId, 'processing', { startedAt: new Date() });
  const journeys = await db
    .collection('journeys')
    .find(
      { ...scope, converted: true, lastTouchAt: { $gte: run.startAt, $lte: run.endAt } },
      { session },
    )
    .toArray();
  const credits: Document[] = [];
  let attributedRevenue = 0;
  let touchpoints = 0;
  for (const journey of journeys) {
    const touches = Array.isArray(journey.touchpoints) ? (journey.touchpoints as Document[]) : [];
    const weights = attributionWeights(String(run.model), touches.length);
    const profile = await db
      .collection('customer_profiles')
      .findOne({ ...scope, id: journey.profileId }, { session });
    const revenue = Number(profile?.lifetimeValue ?? 0);
    attributedRevenue += revenue;
    touchpoints += touches.length;
    touches.forEach((touch, index) =>
      credits.push({
        id: `crd_${opaqueToken(12)}`,
        ...message.scope,
        runId,
        profileId: journey.profileId,
        eventId: touch.eventId,
        source: touch.source,
        campaignId: touch.campaignId,
        weight: weights[index] ?? 0,
        creditedRevenue: revenue * (weights[index] ?? 0),
        createdAt: new Date(),
      }),
    );
  }
  if (credits.length) await db.collection('attribution_credits').insertMany(credits, { session });
  await markRun(db, session, 'attribution_runs', runId, 'completed', {
    completedAt: new Date(),
    journeyCount: journeys.length,
    touchpoints,
    attributedRevenue,
  });
}
