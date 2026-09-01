import { CapabilityPage } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Journeys() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'journeys', 100, { lastTouchAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Cross-channel paths"
      title="Customer journeys"
      description="Inspect online and offline touchpoint sequences, conversion latency and the path responsible for closing outcomes."
      columns={[
        { key: 'profileId', label: 'Profile' },
        { key: 'firstSource', label: 'First touch' },
        { key: 'lastSource', label: 'Latest touch' },
        { key: 'touchpointCount', label: 'Touchpoints' },
        { key: 'converted', label: 'Converted' },
        { key: 'conversionEvent', label: 'Conversion event' },
        { key: 'lastTouchAt', label: 'Latest activity', render: (r) => text(r.lastTouchAt) },
      ]}
      rows={rows}
    />
  );
}
