import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Experiments() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'experiments', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Causal measurement"
      title="Experiments"
      description="Plan geo holdouts, audience holdouts and lift tests with pre-declared metrics, guardrails and analysis windows."
      notice="The workspace currently provides experiment governance and storage. Automated ad-platform holdout creation is a later provider-adapter capability."
      columns={[
        { key: 'name', label: 'Experiment' },
        { key: 'type', label: 'Type' },
        { key: 'primaryMetric', label: 'Primary metric' },
        { key: 'sampleSize', label: 'Sample size' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'startAt', label: 'Start', render: (r) => text(r.startAt) },
        { key: 'endAt', label: 'End', render: (r) => text(r.endAt) },
      ]}
      rows={rows}
    />
  );
}
