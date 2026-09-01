import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
export default async function Billing() {
  const p = await requireServerPrincipal('billing:read');
  const [subscriptions, usage] = await Promise.all([
    listDocuments(p, 'subscriptions', 10),
    listDocuments(p, 'usage_monthly', 30, { periodStart: -1 }),
  ]);
  const subscription = subscriptions[0];
  return (
    <CapabilityPage
      eyebrow="SaaS control plane"
      title="Billing and usage"
      description="Track plan entitlements and metered events, profiles, connectors, activations, AI operations, storage and voice minutes."
      metrics={[
        { label: 'Plan', value: text(subscription?.planName, 'Sandbox') },
        { label: 'Subscription', value: text(subscription?.status, 'active') },
        {
          label: 'Tracked events',
          value: usage.reduce((s, r) => s + numberValue(r.events), 0).toLocaleString('en-IN'),
        },
        {
          label: 'AI operations',
          value: usage.reduce((s, r) => s + numberValue(r.aiOperations), 0).toLocaleString('en-IN'),
        },
      ]}
      notice="The repository contains entitlement and usage metering foundations. Payment-provider checkout and tax invoicing require separate commercial configuration."
      columns={[
        { key: 'periodStart', label: 'Period', render: (r) => text(r.periodStart) },
        { key: 'events', label: 'Events' },
        { key: 'activeProfiles', label: 'Profiles' },
        { key: 'connectors', label: 'Connectors' },
        { key: 'activations', label: 'Activations' },
        { key: 'aiOperations', label: 'AI operations' },
        { key: 'storageBytes', label: 'Storage bytes' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
      ]}
      rows={usage}
    />
  );
}
