import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Sources() {
  const p = await requireServerPrincipal('connector:read');
  const rows = (await listDocuments(p, 'connectors', 100)).filter(
    (r) => r.direction !== 'destination',
  );
  return (
    <CapabilityPage
      eyebrow="Data foundation"
      title="Sources"
      description="Manage advertising, analytics, CRM, commerce, telephony, file and custom ingestion connections."
      metrics={[
        { label: 'Configured', value: rows.length },
        { label: 'Healthy', value: rows.filter((r) => r.status === 'healthy').length },
        { label: 'Degraded', value: rows.filter((r) => r.status === 'degraded').length },
        {
          label: 'Credential action',
          value: rows.filter((r) => r.status === 'credential_required').length,
        },
      ]}
      actions={
        <ApiActionButton
          endpoint="/api/v1/connectors"
          label="Add demo webhook source"
          body={{
            name: 'Website webhook',
            provider: 'webhook',
            direction: 'source',
            authType: 'none',
            configuration: { mode: 'signed_webhook' },
          }}
        />
      }
      columns={[
        { key: 'name', label: 'Source' },
        { key: 'provider', label: 'Provider' },
        { key: 'direction', label: 'Direction' },
        { key: 'healthScore', label: 'Health score' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'lastSyncAt', label: 'Last sync', render: (r) => text(r.lastSyncAt, 'Never') },
      ]}
      rows={rows}
    />
  );
}
