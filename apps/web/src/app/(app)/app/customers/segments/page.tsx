import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Segments() {
  const p = await requireServerPrincipal('audience:read');
  const rows = await listDocuments(p, 'segments', 100);
  return (
    <CapabilityPage
      eyebrow="Customer intelligence"
      title="Segments"
      description="Build reusable behavioral, demographic, lifecycle and value cohorts without coupling them to a destination."
      columns={[
        { key: 'name', label: 'Segment' },
        { key: 'definitionType', label: 'Definition' },
        { key: 'memberCount', label: 'Members' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'refreshedAt', label: 'Last refresh', render: (r) => text(r.refreshedAt) },
      ]}
      rows={rows}
    />
  );
}
