import { CapabilityPage } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Events() {
  const p = await requireServerPrincipal('event:read');
  const rows = await listDocuments(p, 'canonical_events', 100, { eventTime: -1 });
  return (
    <CapabilityPage
      eyebrow="Event collection"
      title="Event explorer"
      description="Inspect validated canonical events while raw payload retention, transformation version and downstream processing remain traceable."
      metrics={[
        { label: 'Visible events', value: rows.length },
        {
          label: 'Consent for ads',
          value: rows.filter(
            (r) => (r.consent as Record<string, unknown> | undefined)?.advertising === true,
          ).length,
        },
        { label: 'Known customer', value: rows.filter((r) => Boolean(r.customerId)).length },
        {
          label: 'Anonymous',
          value: rows.filter((r) => Boolean(r.anonymousId) && !r.customerId).length,
        },
      ]}
      columns={[
        { key: 'eventName', label: 'Event' },
        { key: 'source', label: 'Source' },
        {
          key: 'customerId',
          label: 'Customer',
          render: (r) =>
            text(r.customerId, r.anonymousId ? `Anonymous · ${text(r.anonymousId)}` : '—'),
        },
        { key: 'eventTime', label: 'Occurred at', render: (r) => text(r.eventTime) },
        { key: 'processingStatus', label: 'Processing' },
      ]}
      rows={rows}
    />
  );
}
