import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Calls() {
  const p = await requireServerPrincipal('campaign:read');
  const rows = await listDocuments(p, 'calls', 100, { startedAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Communication intelligence"
      title="Call tracking"
      description="Foundation for dynamic number attribution, recordings, transcription, intent, qualification and CRM write-back."
      notice="Telephony provider calls and recordings are not enabled in the MVP without customer-provided Exotel or Twilio credentials and jurisdiction-specific consent configuration."
      columns={[
        { key: 'trackingNumber', label: 'Tracking number' },
        { key: 'source', label: 'Attributed source' },
        { key: 'profileId', label: 'Customer' },
        { key: 'durationSeconds', label: 'Duration (s)' },
        { key: 'outcome', label: 'Outcome', render: (r) => <StatusBadge value={r.outcome} /> },
        { key: 'qualification', label: 'Qualification' },
        { key: 'startedAt', label: 'Started', render: (r) => text(r.startedAt) },
      ]}
      rows={rows}
    />
  );
}
