import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
function money(v: unknown) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numberValue(v));
}
export default async function Campaigns() {
  const p = await requireServerPrincipal('campaign:read');
  const rows = await listDocuments(p, 'campaigns', 100, { spend: -1 });
  return (
    <CapabilityPage
      eyebrow="Campaign intelligence"
      title="Campaigns"
      description="Compare spend, qualified outcomes, revenue, pacing and attribution across channel hierarchy."
      metrics={[
        { label: 'Campaigns', value: rows.length },
        { label: 'Spend', value: money(rows.reduce((s, r) => s + numberValue(r.spend), 0)) },
        { label: 'Revenue', value: money(rows.reduce((s, r) => s + numberValue(r.revenue), 0)) },
        {
          label: 'Blended ROAS',
          value: `${(
            rows.reduce((s, r) => s + numberValue(r.revenue), 0) /
            Math.max(
              rows.reduce((s, r) => s + numberValue(r.spend), 0),
              1,
            )
          ).toFixed(2)}×`,
        },
      ]}
      columns={[
        { key: 'name', label: 'Campaign' },
        { key: 'channel', label: 'Channel' },
        { key: 'objective', label: 'Objective' },
        { key: 'spend', label: 'Spend', render: (r) => money(r.spend) },
        { key: 'revenue', label: 'Revenue', render: (r) => money(r.revenue) },
        { key: 'conversions', label: 'Conversions' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'updatedAt', label: 'Updated', render: (r) => text(r.updatedAt) },
      ]}
      rows={rows}
    />
  );
}
