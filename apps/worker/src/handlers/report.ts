import type { ClientSession, Db } from 'mongodb';
import { tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
export async function handleReport(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const reportId = requiredString(message.payload.reportId, 'reportId');
  const scope = tenantFilter(message.scope);
  const report = await db.collection('reports').findOne({ ...scope, id: reportId }, { session });
  if (!report) throw new Error('Report not found');
  await markRun(db, session, 'reports', reportId, 'processing', { startedAt: new Date() });
  const match = {
    ...scope,
    createdAt: { $gte: report.dateRange.startAt, $lte: report.dateRange.endAt },
  };
  const [campaigns, events, profiles, findings, approvals] = await Promise.all([
    db.collection('campaigns').find(scope, { session }).toArray(),
    db.collection('canonical_events').countDocuments(match, { session }),
    db.collection('customer_profiles').countDocuments(scope, { session }),
    db.collection('quality_findings').countDocuments({ ...scope, status: 'open' }, { session }),
    db.collection('approvals').countDocuments({ ...scope, status: 'pending' }, { session }),
  ]);
  const spend = campaigns.reduce((sum, row) => sum + Number(row.spend ?? 0), 0);
  const revenue = campaigns.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);
  const artifact = {
    generatedAt: new Date(),
    dateRange: report.dateRange,
    summary: {
      spend,
      revenue,
      roas: spend > 0 ? revenue / spend : 0,
      events,
      profiles,
      openQualityFindings: findings,
      pendingApprovals: approvals,
    },
    campaigns: campaigns.map((row) => ({
      id: row.id,
      name: row.name,
      channel: row.channel,
      spend: row.spend,
      revenue: row.revenue,
      conversions: row.conversions,
    })),
    methodology:
      'Campaign aggregates and tenant-scoped operational counts from MongoDB. No unavailable provider metric was fabricated.',
  };
  await markRun(db, session, 'reports', reportId, 'completed', {
    completedAt: new Date(),
    artifact,
  });
}
