import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';

export default async function Runs() {
  const principal = await requireServerPrincipal('workflow:read');
  const [workflows, agents, connectors] = await Promise.all([
    listDocuments(principal, 'workflow_runs', 50, { createdAt: -1 }),
    listDocuments(principal, 'agent_runs', 50, { createdAt: -1 }),
    listDocuments(principal, 'connector_runs', 50, { createdAt: -1 }),
  ]);

  const runs: Record<string, unknown>[] = [
    ...workflows.map((run) => ({ ...run, runType: 'workflow' })),
    ...agents.map((run) => ({ ...run, runType: 'agent' })),
    ...connectors.map((run) => ({ ...run, runType: 'connector' })),
  ];

  const rows = runs
    .sort((a, b) => String(b['createdAt'] ?? '').localeCompare(String(a['createdAt'] ?? '')))
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
          render: (row) => text(row.name, text(row.agentId ?? row.workflowId)),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <StatusBadge value={row.status} />,
        },
        { key: 'attempt', label: 'Attempt' },
        { key: 'correlationId', label: 'Correlation ID' },
        { key: 'createdAt', label: 'Created', render: (row) => text(row.createdAt) },
        {
          key: 'completedAt',
          label: 'Completed',
          render: (row) => text(row.completedAt, '—'),
        },
      ]}
      rows={rows}
    />
  );
}
