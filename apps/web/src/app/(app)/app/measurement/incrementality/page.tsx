import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Incrementality() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'incrementality_results', 100, { computedAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Causal intelligence"
      title="Incrementality"
      description="Separate attributed return from likely causal lift using controlled experiments and uncertainty-aware estimates."
      notice="Causal models require sufficient experimental or observational data. The platform does not label attribution as causal evidence."
      columns={[
        { key: 'experimentName', label: 'Experiment' },
        { key: 'channel', label: 'Channel' },
        { key: 'incrementalConversions', label: 'Incremental conversions' },
        { key: 'incrementalRevenue', label: 'Incremental revenue' },
        { key: 'incrementalRoas', label: 'Incremental ROAS' },
        { key: 'confidenceInterval', label: 'Confidence interval' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'computedAt', label: 'Computed', render: (r) => text(r.computedAt) },
      ]}
      rows={rows}
    />
  );
}
