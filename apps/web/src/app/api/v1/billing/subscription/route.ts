import { publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) => {
      const subscription = await db
        .collection('subscriptions')
        .findOne(tenantFilter(principal.tenant));
      const usage = await db
        .collection('usage_monthly')
        .find(tenantFilter(principal.tenant))
        .sort({ periodStart: -1 })
        .limit(12)
        .toArray();
      return {
        subscription: subscription ? publicDocument(subscription) : null,
        usage: usage.map((doc) => publicDocument(doc)),
      };
    },
    { permission: 'billing:read' },
  );
}
