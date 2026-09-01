import { audienceSchema } from '@easyinsights/contracts';
import { appendAudit, opaqueToken, publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('audiences')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'audience:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, audienceSchema);
      const now = new Date();
      const doc = {
        id: `audn_${opaqueToken(12)}`,
        ...principal.tenant,
        ...input,
        status: 'draft',
        memberCount: 0,
        eligibleCount: 0,
        createdBy: principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection('audiences').insertOne(doc);
      await appendAudit(db, {
        scope: principal.tenant,
        actorId: principal.userId,
        action: 'audience.create',
        resourceType: 'audience',
        resourceId: doc.id,
        requestId,
      });
      return publicDocument(doc);
    },
    { permission: 'audience:write' },
  );
}
