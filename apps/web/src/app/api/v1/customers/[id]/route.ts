import { publicDocument, tenantFilter } from '@easyinsights/core';
import { ApiError, handleApi } from '@/server/api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ principal, db }) => {
      const doc = await db
        .collection('customer_profiles')
        .findOne({ ...tenantFilter(principal.tenant), id });
      if (!doc) throw new ApiError(404, 'NOT_FOUND', 'Customer profile not found.');
      return publicDocument(doc);
    },
    { permission: 'customer:read' },
  );
}
