import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Workflows() {
  const p = await requireServerPrincipal('workflow:read');
  const rows = await listDocuments(p, 'workflows', 100);
  return (
    <CapabilityPage
      eyebrow="Orchestration"
      title="Workflows"
      description="Version triggers, decisions, delays, approvals, actions, validation and notifications with resumable run history."
      actions={
        rows[0] ? (
          <ApiActionButton
            endpoint={`/api/v1/workflows/${text(rows[0].id)}/execute`}
            label="Dry-run first workflow"
            body={{ trigger: { type: 'manual', sample: true }, dryRun: true }}
          />
        ) : null
      }
      columns={[
        { key: 'name', label: 'Workflow' },
        { key: 'version', label: 'Version' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'nodeCount', label: 'Nodes' },
        {
          key: 'dryRunDefault',
          label: 'Default mode',
          render: (r) => (r.dryRunDefault ? 'Dry run' : 'Live eligible'),
        },
        {
          key: 'lastRunStatus',
          label: 'Last run',
          render: (r) => <StatusBadge value={r.lastRunStatus} />,
        },
        { key: 'updatedAt', label: 'Updated', render: (r) => text(r.updatedAt) },
      ]}
      rows={rows}
    />
  );
}
