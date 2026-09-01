import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Admin() {
  const p = await requireServerPrincipal('platform:admin');
  const [orgs, incidents, features] = await Promise.all([
    listDocuments(p, 'organizations', 100),
    listDocuments(p, 'incidents', 100, { createdAt: -1 }),
    listDocuments(p, 'feature_flags', 100),
  ]);
  return (
    <CapabilityPage
      eyebrow="Platform control plane"
      title="Platform administration"
      description="Operate tenants, feature flags, incidents, support controls and deployment-wide safety policy."
      metrics={[
        { label: 'Organizations', value: orgs.length },
        { label: 'Open incidents', value: incidents.filter((r) => r.status !== 'resolved').length },
        { label: 'Feature flags', value: features.length },
        {
          label: 'Live activation',
          value: process.env.LIVE_ACTIVATION_ENABLED === 'true' ? 'Enabled' : 'Disabled',
        },
      ]}
      notice="Platform administration is accessible only to the seeded platform administrator in local development."
      columns={[
        { key: 'name', label: 'Organization' },
        { key: 'slug', label: 'Slug' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'plan', label: 'Plan' },
        { key: 'dataRegion', label: 'Data region' },
        { key: 'createdAt', label: 'Created', render: (r) => text(r.createdAt) },
      ]}
      rows={orgs}
    />
  );
}
