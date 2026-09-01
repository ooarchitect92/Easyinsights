import { CapabilityPage } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
function money(v: unknown) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(numberValue(v));
}
export default async function Spend() {
  const p = await requireServerPrincipal('campaign:read');
  const rows = await listDocuments(p, 'spend_facts', 100, { date: -1 });
  return (
    <CapabilityPage
      eyebrow="Financial observability"
      title="Spend and pacing"
      description="Reconcile channel spend, budget pacing, currency normalization and attributed return."
      metrics={[
        {
          label: 'Visible spend',
          value: money(rows.reduce((s, r) => s + numberValue(r.spend), 0)),
        },
        { label: 'Budget', value: money(rows.reduce((s, r) => s + numberValue(r.budget), 0)) },
        {
          label: 'Variance flags',
          value: rows.filter((r) => Math.abs(numberValue(r.variancePercent)) > 10).length,
        },
        { label: 'Currencies', value: new Set(rows.map((r) => text(r.currency))).size },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (r) => text(r.date) },
        { key: 'channel', label: 'Channel' },
        { key: 'campaignName', label: 'Campaign' },
        { key: 'spend', label: 'Spend', render: (r) => money(r.spend) },
        { key: 'budget', label: 'Budget', render: (r) => money(r.budget) },
        { key: 'variancePercent', label: 'Variance %' },
        { key: 'currency', label: 'Currency' },
      ]}
      rows={rows}
    />
  );
}
