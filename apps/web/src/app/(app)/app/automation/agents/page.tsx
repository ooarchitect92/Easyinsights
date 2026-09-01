import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Agents() {
  const p = await requireServerPrincipal('agent:read');
  const rows = await listDocuments(p, 'agents', 100);
  return (
    <CapabilityPage
      eyebrow="Governed intelligence"
      title="AI agents"
      description="Run analyst, data-quality, attribution, lead, audience, campaign, report and connector agents under explicit autonomy policy."
      actions={
        rows[0] ? (
          <ApiActionButton
            endpoint={`/api/v1/agents/${text(rows[0].id)}/execute`}
            label="Run first agent"
            body={{
              prompt:
                'Review current workspace performance and list the three highest-value actions with evidence.',
              context: { windowDays: 30 },
              dryRun: true,
            }}
          />
        ) : null
      }
      notice="Deterministic analytics remain available without an external model. Model-generated output is labeled with its provider and cannot directly bypass approval policy."
      columns={[
        { key: 'name', label: 'Agent' },
        { key: 'type', label: 'Type' },
        { key: 'autonomy', label: 'Autonomy' },
        {
          key: 'enabled',
          label: 'Enabled',
          render: (r) => <StatusBadge value={r.enabled ? 'active' : 'paused'} />,
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
