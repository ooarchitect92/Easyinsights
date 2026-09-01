import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Identity() {
  const p = await requireServerPrincipal('customer:read');
  const rows = await listDocuments(p, 'identity_decisions', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Customer graph"
      title="Identity resolution"
      description="Review deterministic merge evidence and keep every profile merge explainable, reversible and tenant-scoped."
      notice="Automatic resolution uses normalized, hashed identifiers and explicit external IDs. Probabilistic merges require a review policy before activation."
      columns={[
        { key: 'profileId', label: 'Profile' },
        { key: 'decision', label: 'Decision', render: (r) => <StatusBadge value={r.decision} /> },
        {
          key: 'matchedOn',
          label: 'Evidence',
          render: (r) => (Array.isArray(r.matchedOn) ? r.matchedOn.join(', ') : text(r.matchedOn)),
        },
        { key: 'confidence', label: 'Confidence' },
        { key: 'createdAt', label: 'Resolved at', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
