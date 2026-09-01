import { publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('organizations')
          .find({ id: principal.tenant.organizationId })
          .limit(1)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'organization:read' },
  );
}
