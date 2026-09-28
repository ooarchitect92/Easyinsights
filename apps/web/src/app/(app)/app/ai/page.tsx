import { modelAssignments, routeReadiness } from '@easyinsights/ai';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
export default async function AiAdministration() {
  await requireServerPrincipal('ai:read');
  const rows = modelAssignments.map((item) => {
    const r = routeReadiness(item.task);
    return {
      task: item.task,
      provider: item.provider,
      model: item.requestedIdentifier,
      kind: item.kind,
      documentation: item.documentation,
      implementation: r.implementation,
      access: r.liveAccessVerified ? 'verified' : 'not verified',
      state: r.state,
    };
  });
  return (
    <CapabilityPage
      eyebrow="Model governance"
      title="AI administration"
      description="Exact task-to-model assignments, implementation status and live-access readiness. Configuration does not equal qualification."
      notice="Hosted execution remains blocked unless the exact route is documented, credentials are configured, live account access is verified and deployment policy enables it."
      columns={[
        { key: 'task', label: 'Task' },
        { key: 'provider', label: 'Provider' },
        { key: 'model', label: 'Requested model' },
        { key: 'kind', label: 'Kind' },
        { key: 'documentation', label: 'Docs' },
        { key: 'implementation', label: 'Implementation' },
        { key: 'access', label: 'Live access' },
        { key: 'state', label: 'State', render: (r) => <StatusBadge value={r.state} /> },
      ]}
      rows={rows}
    />
  );
}
