import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Schemas() {
  const p = await requireServerPrincipal('event:read');
  const rows = await listDocuments(p, 'schema_versions', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Governed contracts"
      title="Schema registry"
      description="Version event and connector schemas, compare drift, test mappings and preserve the transformation version attached to every event."
      columns={[
        { key: 'name', label: 'Schema' },
        { key: 'version', label: 'Version' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'compatibility', label: 'Compatibility' },
        { key: 'createdAt', label: 'Published', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
