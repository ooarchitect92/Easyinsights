import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Forecasting() {
  const p = await requireServerPrincipal('measurement:read');
  const rows = await listDocuments(p, 'forecasts', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Scenario planning"
      title="Forecasting"
      description="Store baseline forecasts, budget response curves, marginal return and uncertainty for decision review."
      notice="Forecasts are decision support, not guarantees. Each result preserves its model version, data window and confidence range."
      columns={[
        { key: 'name', label: 'Scenario' },
        { key: 'metric', label: 'Metric' },
        { key: 'horizonDays', label: 'Horizon' },
        { key: 'forecastValue', label: 'Forecast' },
        { key: 'lowerBound', label: 'Lower' },
        { key: 'upperBound', label: 'Upper' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
