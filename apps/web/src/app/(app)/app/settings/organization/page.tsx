import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Organization() {
  const p = await requireServerPrincipal('organization:read');
  const [orgs, workspaces, members] = await Promise.all([
    listDocuments(p, 'organizations', 5),
    listDocuments(p, 'workspaces', 20),
    listDocuments(p, 'memberships', 100),
  ]);
  return (
    <CapabilityPage
      eyebrow="Tenant control"
      title="Organization settings"
      description="Manage agency hierarchy, brands, workspace isolation, regional settings, members and policy assignments."
      metrics={[
        { label: 'Organization', value: text(orgs[0]?.name) },
        { label: 'Workspaces', value: workspaces.length },
        { label: 'Members', value: members.length },
        { label: 'Region', value: text(orgs[0]?.dataRegion, 'India') },
      ]}
      columns={[
        { key: 'userName', label: 'Member' },
        { key: 'email', label: 'Email' },
        {
          key: 'roles',
          label: 'Roles',
          render: (r) => (Array.isArray(r.roles) ? r.roles.join(', ') : '—'),
        },
        { key: 'workspaceName', label: 'Workspace' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        { key: 'createdAt', label: 'Added', render: (r) => text(r.createdAt) },
      ]}
      rows={members}
    />
  );
}
