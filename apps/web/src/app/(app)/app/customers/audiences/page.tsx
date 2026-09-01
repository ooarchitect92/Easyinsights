import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Audiences() {
  const p = await requireServerPrincipal('audience:read');
  const rows = await listDocuments(p, 'audiences', 100);
  return (
    <CapabilityPage
      eyebrow="Activation audiences"
      title="Audiences"
      description="Evaluate consent-aware profile rules, estimate matchability and synchronize only through approved destinations."
      actions={
        rows[0] ? (
          <ApiActionButton
            endpoint={`/api/v1/audiences/${text(rows[0].id)}/activate`}
            label="Evaluate first audience"
            body={{ dryRun: true }}
          />
        ) : null
      }
      columns={[
        { key: 'name', label: 'Audience' },
        { key: 'memberCount', label: 'Members' },
        { key: 'eligibleCount', label: 'Consent eligible' },
        {
          key: 'destinations',
          label: 'Destinations',
          render: (r) => (Array.isArray(r.destinations) ? r.destinations.join(', ') : '—'),
        },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        {
          key: 'lastEvaluatedAt',
          label: 'Evaluated',
          render: (r) => text(r.lastEvaluatedAt, 'Never'),
        },
      ]}
      rows={rows}
    />
  );
}
