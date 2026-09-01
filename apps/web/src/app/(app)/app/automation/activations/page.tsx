import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Activations() {
  const p = await requireServerPrincipal('activation:read');
  const rows = await listDocuments(p, 'activation_runs', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Closed-loop delivery"
      title="Activations"
      description="Track conversion events, audience syncs, CRM write-back and analytics delivery from request through destination response."
      notice="Live delivery is deny-by-default. A production adapter, credential reference, consent check, approval and deployment allowlist must all succeed."
      columns={[
        { key: 'type', label: 'Activation' },
        { key: 'destinationProvider', label: 'Destination' },
        { key: 'dryRun', label: 'Mode', render: (r) => (r.dryRun ? 'Dry run' : 'Live requested') },
        { key: 'eligibleProfiles', label: 'Eligible' },
        { key: 'excludedProfiles', label: 'Excluded' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
