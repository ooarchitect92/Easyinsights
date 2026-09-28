import { modelAssignments, routeReadiness } from '@easyinsights/ai';
import { handleApi } from '@/server/api';
export async function GET(request: Request) {
  return handleApi(
    request,
    async () =>
      modelAssignments.map((item) => {
        const r = routeReadiness(item.task);
        return {
          task: item.task,
          kind: item.kind,
          provider: item.provider,
          requestedIdentifier: item.requestedIdentifier,
          library: item.library || null,
          documentation: item.documentation,
          documentationUrl: item.documentationUrl || null,
          implementation: r.implementation,
          credentialConfigured: r.credentialConfigured,
          liveAccessVerified: r.liveAccessVerified,
          servingReady: r.servingReady,
          state: r.state,
          reasons: r.reasons,
        };
      }),
    { permission: 'ai:read' },
  );
}
