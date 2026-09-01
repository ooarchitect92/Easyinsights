import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Principal } from '@easyinsights/contracts';
import {
  BarChart3,
  Cable,
  Database,
  Users,
  Megaphone,
  GitFork,
  Bot,
  Bell,
  FileText,
  CreditCard,
  Settings,
  ShieldCheck,
  Boxes,
} from 'lucide-react';
import { LogoutButton } from './logout-button';
const groups = [
  { label: 'Overview', items: [['/app', 'Command centre', BarChart3]] },
  {
    label: 'Data',
    items: [
      ['/app/data/sources', 'Sources', Cable],
      ['/app/data/destinations', 'Destinations', Boxes],
      ['/app/data/events', 'Event explorer', Database],
      ['/app/data/identity', 'Identity resolution', GitFork],
      ['/app/data/quality', 'Data quality', ShieldCheck],
      ['/app/data/schemas', 'Schema registry', FileText],
    ],
  },
  {
    label: 'Customers',
    items: [
      ['/app/customers', 'Customer 360', Users],
      ['/app/customers/segments', 'Segments', GitFork],
      ['/app/customers/audiences', 'Audiences', Users],
      ['/app/customers/consent', 'Consent', ShieldCheck],
    ],
  },
  {
    label: 'Marketing',
    items: [
      ['/app/marketing/campaigns', 'Campaigns', Megaphone],
      ['/app/marketing/creatives', 'Creatives', FileText],
      ['/app/marketing/spend', 'Spend', CreditCard],
      ['/app/marketing/calls', 'Calls', Bell],
      ['/app/marketing/experiments', 'Experiments', GitFork],
    ],
  },
  {
    label: 'Measurement',
    items: [
      ['/app/measurement/funnels', 'Funnels', GitFork],
      ['/app/measurement/journeys', 'Journeys', GitFork],
      ['/app/measurement/attribution', 'Attribution', BarChart3],
      ['/app/measurement/incrementality', 'Incrementality', BarChart3],
      ['/app/measurement/forecasting', 'Forecasting', BarChart3],
    ],
  },
  {
    label: 'Automation',
    items: [
      ['/app/automation/agents', 'Agents', Bot],
      ['/app/automation/workflows', 'Workflows', GitFork],
      ['/app/automation/approvals', 'Approvals', ShieldCheck],
      ['/app/automation/activations', 'Activations', Cable],
      ['/app/automation/runs', 'Run history', FileText],
    ],
  },
  {
    label: 'Manage',
    items: [
      ['/app/alerts', 'Alerts', Bell],
      ['/app/reports', 'Reports', FileText],
      ['/app/billing', 'Billing', CreditCard],
      ['/app/settings/organization', 'Organization', Settings],
      ['/app/settings/audit', 'Audit trail', ShieldCheck],
      ['/app/admin', 'Platform admin', Settings],
    ],
  },
] as const;
export function AppShell({ principal, children }: { principal: Principal; children: ReactNode }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/app" className="brand">
          <span className="brand-mark">E</span>
          <span>
            Easyinsights<small>Marketing OS</small>
          </span>
        </Link>
        <nav>
          {groups.map((group) => (
            <section key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.items.map(([href, label, Icon]) => (
                <Link href={href} key={href}>
                  <Icon size={16} />
                  <span>{label}</span>
                </Link>
              ))}
            </section>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{principal.name}</strong>
          <span>{principal.email}</span>
          <LogoutButton />
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <span className="workspace-dot" /> Demo Growth Workspace
          </div>
          <div className="topbar-meta">{principal.roles.join(' · ')}</div>
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
