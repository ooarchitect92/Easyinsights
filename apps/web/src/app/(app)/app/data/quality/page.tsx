import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
export default async function Quality() {
  const p = await requireServerPrincipal('event:read');
  const rows = await listDocuments(p, 'quality_findings', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Observability"
      title="Data quality centre"
      description="Detect missing campaign IDs, duplicate conversions, schema drift, invalid identifiers, delayed syncs and spend-to-revenue discrepancies."
      metrics={[
        { label: 'Open findings', value: rows.filter((r) => r.status !== 'resolved').length },
        { label: 'Critical', value: rows.filter((r) => r.severity === 'critical').length },
        {
          label: 'Average impact',
          value: `${(rows.reduce((s, r) => s + numberValue(r.impactScore), 0) / Math.max(rows.length, 1)).toFixed(0)}/100`,
        },
        { label: 'Silent repair', value: 'Disabled', detail: 'Approval is required' },
      ]}
      columns={[
        { key: 'title', label: 'Finding' },
        { key: 'category', label: 'Category' },
        { key: 'severity', label: 'Severity', render: (r) => <StatusBadge value={r.severity} /> },
        { key: 'impactScore', label: 'Impact' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'createdAt', label: 'Detected', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
