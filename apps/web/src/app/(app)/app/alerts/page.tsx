import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Alerts() {
  const p = await requireServerPrincipal('workspace:read');
  const rows = await listDocuments(p, 'alerts', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Operational awareness"
      title="Alerts"
      description="Prioritize connector, data-quality, spend, performance, fraud and policy anomalies with accountable ownership."
      columns={[
        { key: 'title', label: 'Alert' },
        { key: 'category', label: 'Category' },
        { key: 'severity', label: 'Severity', render: (r) => <StatusBadge value={r.severity} /> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'ownerName', label: 'Owner' },
        { key: 'createdAt', label: 'Detected', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
