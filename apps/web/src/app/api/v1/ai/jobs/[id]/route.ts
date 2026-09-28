import { publicDocument, tenantFilter } from '@easyinsights/core';
import { ApiError, handleApi } from '@/server/api';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleApi(
    request,
    async ({ principal, db }) => {
      const job = await db.collection('ai_jobs').findOne({ ...tenantFilter(principal.tenant), id });
      if (!job) throw new ApiError(404, 'NOT_FOUND', 'AI job not found.');
      return publicDocument(job);
    },
    { permission: 'ai:read' },
  );
}
