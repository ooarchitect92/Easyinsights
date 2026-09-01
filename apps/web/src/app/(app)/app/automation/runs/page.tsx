import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Runs() {
  const p = await requireServerPrincipal('workflow:read');
  const [workflows, agents, connectors] = await Promise.all([
    listDocuments(p, 'workflow_runs', 50, { createdAt: -1 }),
    listDocuments(p, 'agent_runs', 50, { createdAt: -1 }),
    listDocuments(p, 'connector_runs', 50, { createdAt: -1 }),
  ]);
  const rows: Record<string, unknown>[] = [
    ...workflows.map((r) => ({ ...r, runType: 'workflow' })),
    ...agents.map((r) => ({ ...r, runType: 'agent' })),
    ...connectors.map((r) => ({ ...r, runType: 'connector' })),
  ]
    .sort((a, b) => String(b['createdAt']).localeCompare(String(a['createdAt'])))
    .slice(0, 100);
  return (
    <CapabilityPage
      eyebrow="Execution evidence"
      title="Run history"
      description="Inspect durable state, retries, approvals, errors and expiration for every asynchronous operation."
      columns={[
        { key: 'runType', label: 'Type' },
        {
          key: 'name',
          label: 'Name',
          render: (r) => text(r.name, text(r.agentId ?? r.workflowId)),
        },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'attempt', label: 'Attempt' },
        { key: 'correlationId', label: 'Correlation ID' },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
        { key: 'completedAt', label: 'Completed', render: (r) => text(r.completedAt, '—') },
      ]}
      rows={rows}
    />
  );
}
