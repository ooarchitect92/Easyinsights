import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Reports() {
  const p = await requireServerPrincipal('report:read');
  const rows = await listDocuments(p, 'reports', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Decision-ready reporting"
      title="Reports"
      description="Generate executive, campaign, attribution, data-quality and agency narratives with preserved query windows and evidence."
      actions={
        <ApiActionButton
          endpoint="/api/v1/reports"
          label="Generate 30-day report"
          body={{
            name: '30-day executive report',
            type: 'executive',
            dateRange: {
              startAt: new Date(Date.now() - 30 * 86400000).toISOString(),
              endAt: new Date().toISOString(),
            },
            format: 'json',
            recipients: [],
          }}
        />
      }
      columns={[
        { key: 'name', label: 'Report' },
        { key: 'type', label: 'Type' },
        { key: 'format', label: 'Format' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'schedule', label: 'Schedule', render: (r) => text(r.schedule, 'On demand') },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
