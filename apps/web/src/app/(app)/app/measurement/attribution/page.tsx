import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, numberValue, text } from '@/server/data';
export default async function Attribution() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'attribution_runs', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Explainable measurement"
      title="Attribution"
      description="Compare first-touch, last-touch, linear, time-decay, position-based and governed custom models over the same conversion set."
      actions={
        <ApiActionButton
          endpoint="/api/v1/attribution/runs"
          label="Run 30-day linear model"
          body={{
            model: 'linear',
            conversionEvent: 'payment_completed',
            windowDays: 30,
            startAt: new Date(Date.now() - 30 * 86400000).toISOString(),
            endAt: new Date().toISOString(),
            configuration: {},
          }}
        />
      }
      metrics={[
        { label: 'Runs', value: rows.length },
        { label: 'Completed', value: rows.filter((r) => r.status === 'completed').length },
        {
          label: 'Revenue credited',
          value: `₹${rows.reduce((s, r) => s + numberValue(r.attributedRevenue), 0).toLocaleString('en-IN')}`,
        },
        { label: 'Model versions', value: new Set(rows.map((r) => text(r.modelVersion))).size },
      ]}
      columns={[
        { key: 'model', label: 'Model' },
        { key: 'conversionEvent', label: 'Conversion' },
        { key: 'windowDays', label: 'Window' },
        { key: 'touchpoints', label: 'Touchpoints' },
        {
          key: 'attributedRevenue',
          label: 'Revenue',
          render: (r) => `₹${numberValue(r.attributedRevenue).toLocaleString('en-IN')}`,
        },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
