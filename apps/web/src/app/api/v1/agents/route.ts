import { agentSchema } from '@easyinsights/contracts';
import { appendAudit, opaqueToken, publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('agents')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'agent:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, agentSchema);
      const now = new Date();
      const doc = {
        id: `agt_${opaqueToken(12)}`,
        ...principal.tenant,
        ...input,
        version: 1,
        createdBy: principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection('agents').insertOne(doc);
      await appendAudit(db, {
        scope: principal.tenant,
        actorId: principal.userId,
        action: 'agent.create',
        resourceType: 'agent',
        resourceId: doc.id,
        requestId,
      });
      return publicDocument(doc);
    },
    { permission: 'agent:execute' },
  );
}
