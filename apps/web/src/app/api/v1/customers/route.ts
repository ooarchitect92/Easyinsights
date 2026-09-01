import { publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('customer_profiles')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'customer:read' },
  );
}
