import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Funnels() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'funnel_results', 100, { computedAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Journey intelligence"
      title="Funnels"
      description="Measure conversion, latency and leakage from ad click through qualified lead, appointment and closed revenue."
      columns={[
        { key: 'funnelName', label: 'Funnel' },
        { key: 'stageName', label: 'Stage' },
        { key: 'entered', label: 'Entered' },
        { key: 'completed', label: 'Completed' },
        { key: 'conversionRate', label: 'Conversion %' },
        { key: 'medianTimeSeconds', label: 'Median time (s)' },
        { key: 'status', label: 'Health', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'computedAt', label: 'Computed', render: (r) => text(r.computedAt) },
      ]}
      rows={rows}
    />
  );
}
