import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Creatives() {
  const p = await requireServerPrincipal('campaign:read');
  const rows = await listDocuments(p, 'creatives', 100, { updatedAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Creative intelligence"
      title="Creatives"
      description="Analyze format, hook, message, CTA, audience fit, fatigue and brand-compliance evidence without automatically publishing changes."
      notice="Generated briefs and variants are recommendations. Publishing requires a supported provider adapter and approval policy."
      columns={[
        { key: 'name', label: 'Creative' },
        { key: 'format', label: 'Format' },
        { key: 'campaignName', label: 'Campaign' },
        { key: 'performanceScore', label: 'Score' },
        {
          key: 'fatigueStatus',
          label: 'Fatigue',
          render: (r) => <StatusBadge value={r.fatigueStatus} />,
        },
        {
          key: 'brandStatus',
          label: 'Brand compliance',
          render: (r) => <StatusBadge value={r.brandStatus} />,
        },
        { key: 'updatedAt', label: 'Analyzed', render: (r) => text(r.updatedAt) },
      ]}
      rows={rows}
    />
  );
}
