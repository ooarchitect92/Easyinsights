import Link from 'next/link';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
export default async function Customers() {
  const p = await requireServerPrincipal('customer:read');
  const rows = await listDocuments(p, 'customer_profiles', 100, { lastSeenAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Customer 360"
      title="Unified customer profiles"
      description="Explore consent, identity evidence, journey context, lead quality, lifetime value and recommended next action."
      metrics={[
        { label: 'Profiles', value: rows.length },
        { label: 'A-grade leads', value: rows.filter((r) => r.leadGrade === 'A').length },
        {
          label: 'Known identity',
          value: rows.filter((r) => Boolean(r.primaryEmailHash) || Boolean(r.primaryPhoneHash))
            .length,
        },
        {
          label: 'Visible LTV',
          value: new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(rows.reduce((s, r) => s + numberValue(r.lifetimeValue), 0)),
        },
      ]}
      columns={[
        {
          key: 'displayName',
          label: 'Customer',
          render: (r) => (
            <Link href={`/app/customers/${text(r.id)}`}>
              <strong>{text(r.displayName, 'Anonymous customer')}</strong>
            </Link>
          ),
        },
        { key: 'leadGrade', label: 'Grade', render: (r) => <StatusBadge value={r.leadGrade} /> },
        { key: 'leadScore', label: 'Score' },
        { key: 'stage', label: 'Stage' },
        {
          key: 'lifetimeValue',
          label: 'Lifetime value',
          render: (r) => `₹${numberValue(r.lifetimeValue).toLocaleString('en-IN')}`,
        },
        { key: 'lastSeenAt', label: 'Last seen', render: (r) => text(r.lastSeenAt) },
      ]}
      rows={rows}
    />
  );
}
