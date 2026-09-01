import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Consent() {
  const p = await requireServerPrincipal('customer:read');
  const rows = await listDocuments(p, 'consent_ledger', 100, { capturedAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Privacy"
      title="Consent ledger"
      description="Preserve purpose, source, evidence and revocation history before any advertising or communication activation."
      columns={[
        { key: 'profileId', label: 'Profile' },
        { key: 'purpose', label: 'Purpose' },
        {
          key: 'granted',
          label: 'State',
          render: (r) => <StatusBadge value={r.granted ? 'approved' : 'rejected'} />,
        },
        { key: 'source', label: 'Source' },
        { key: 'evidenceReference', label: 'Evidence' },
        { key: 'capturedAt', label: 'Captured', render: (r) => text(r.capturedAt) },
      ]}
      rows={rows}
    />
  );
}
