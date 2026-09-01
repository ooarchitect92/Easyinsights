import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Destinations() {
  const p = await requireServerPrincipal('connector:read');
  const rows = (await listDocuments(p, 'connectors', 100)).filter((r) => r.direction !== 'source');
  return (
    <CapabilityPage
      eyebrow="Activation"
      title="Destinations"
      description="Destinations remain dry-run or approval-gated until a supported provider adapter and valid credential reference are configured."
      notice="A configured record does not imply a live provider connection. Live activation is disabled by default at deployment level."
      columns={[
        { key: 'name', label: 'Destination' },
        { key: 'provider', label: 'Provider' },
        { key: 'authType', label: 'Authentication' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'lastSyncAt', label: 'Last delivery', render: (r) => text(r.lastSyncAt, 'Never') },
      ]}
      rows={rows}
    />
  );
}
