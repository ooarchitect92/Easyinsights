import type { Sort } from 'mongodb';
import type { Principal } from '@easyinsights/contracts';
import { getCache, getDb, publicDocument, tenantFilter } from '@easyinsights/core';
export async function listDocuments(
  principal: Principal,
  collection: string,
  limit = 50,
  sort: Sort = { createdAt: -1 },
): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  return (
    await db
      .collection(collection)
      .find(tenantFilter(principal.tenant))
      .sort(sort)
      .limit(limit)
      .toArray()
  ).map((doc) => publicDocument(doc) as Record<string, unknown>);
}
export async function oneDocument(
  principal: Principal,
  collection: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const db = await getDb();
  const doc = await db.collection(collection).findOne({ ...tenantFilter(principal.tenant), id });
  return doc ? (publicDocument(doc) as Record<string, unknown>) : null;
}
export async function dashboardData(principal: Principal): Promise<Record<string, unknown>> {
  const cache = getCache();
  return cache.getOrLoad(
    `dashboard:${principal.tenant.organizationId}:${principal.tenant.workspaceId}`,
    30,
    async () => {
      const db = await getDb();
      const scope = tenantFilter(principal.tenant);
      const [campaigns, customers, events, connectors, approvals, alerts, spendRevenue] =
        await Promise.all([
          db.collection('campaigns').countDocuments(scope),
          db.collection('customer_profiles').countDocuments(scope),
          db.collection('canonical_events').countDocuments(scope),
          db.collection('connectors').countDocuments(scope),
          db.collection('approvals').countDocuments({ ...scope, status: 'pending' }),
          db
            .collection('alerts')
            .countDocuments({ ...scope, status: { $in: ['open', 'investigating'] } }),
          db
            .collection('campaigns')
            .aggregate([
              { $match: scope },
              {
                $group: {
                  _id: null,
                  spend: { $sum: '$spend' },
                  revenue: { $sum: '$revenue' },
                  conversions: { $sum: '$conversions' },
                },
              },
            ])
            .next(),
        ]);
      const spend = Number(spendRevenue?.spend ?? 0);
      const revenue = Number(spendRevenue?.revenue ?? 0);
      return {
        campaigns,
        customers,
        events,
        connectors,
        pendingApprovals: approvals,
        openAlerts: alerts,
        spend,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        conversions: Number(spendRevenue?.conversions ?? 0),
      };
    },
  );
}
export function text(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
export function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
}
