import { connectorSchema } from '@easyinsights/contracts';
import { appendAudit, opaqueToken, publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('connectors')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'connector:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, connectorSchema);
      const now = new Date();
      const doc = {
        id: `con_${opaqueToken(12)}`,
        ...principal.tenant,
        ...input,
        status: input.authType === 'none' ? 'healthy' : 'credential_required',
        healthScore: input.authType === 'none' ? 100 : 0,
        createdBy: principal.userId,
        createdAt: now,
        updatedAt: now,
        dataClassification: 'confidential',
      };
      await db.collection('connectors').insertOne(doc);
      await appendAudit(db, {
        scope: principal.tenant,
        actorId: principal.userId,
        action: 'connector.create',
        resourceType: 'connector',
        resourceId: doc.id,
        requestId,
        metadata: { provider: doc.provider, direction: doc.direction },
      });
      return publicDocument(doc);
    },
    { permission: 'connector:write' },
  );
}
