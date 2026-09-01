import { workflowSchema } from '@easyinsights/contracts';
import { appendAudit, opaqueToken, publicDocument, tenantFilter } from '@easyinsights/core';
import { handleApi, parseBody } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async ({ principal, db }) =>
      (
        await db
          .collection('workflows')
          .find(tenantFilter(principal.tenant))
          .sort({ createdAt: -1 })
          .limit(200)
          .toArray()
      ).map((doc) => publicDocument(doc)),
    { permission: 'workflow:read' },
  );
}
export async function POST(request: Request) {
  return handleApi(
    request,
    async ({ requestId, principal, db }) => {
      const input = await parseBody(request, workflowSchema);
      const now = new Date();
      const doc = {
        id: `wfl_${opaqueToken(12)}`,
        ...principal.tenant,
        ...input,
        version: 1,
        nodeCount: input.nodes.length,
        createdBy: principal.userId,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection('workflows').insertOne(doc);
      await db.collection('workflow_versions').insertOne({
        id: `wfv_${opaqueToken(12)}`,
        ...principal.tenant,
        workflowId: doc.id,
        version: 1,
        snapshot: input,
        createdBy: principal.userId,
        createdAt: now,
      });
      await appendAudit(db, {
        scope: principal.tenant,
        actorId: principal.userId,
        action: 'workflow.create',
        resourceType: 'workflow',
        resourceId: doc.id,
        requestId,
      });
      return publicDocument(doc);
    },
    { permission: 'workflow:write' },
  );
}
