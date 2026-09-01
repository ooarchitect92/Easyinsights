import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { dashboardData, listDocuments, numberValue, text } from '@/server/data';
function money(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}
export default async function Dashboard() {
  const principal = await requireServerPrincipal('workspace:read');
  const [summary, campaigns, connectors, activities] = await Promise.all([
    dashboardData(principal),
    listDocuments(principal, 'campaigns', 5, { spend: -1 }),
    listDocuments(principal, 'connectors', 6, { healthScore: -1 }),
    listDocuments(principal, 'audit_logs', 7, { createdAt: -1 }),
  ]);
  return (
    <CapabilityPage
      eyebrow="Growth command centre"
      title="Marketing performance you can trust"
      description="Monitor connected data, customer outcomes, attribution and governed actions across this workspace."
      actions={
        <ApiActionButton
          endpoint="/api/v1/reports"
          label="Generate executive report"
          body={{
            name: 'Executive performance report',
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
      metrics={[
        {
          label: 'Attributed revenue',
          value: money(numberValue(summary.revenue)),
          detail: `${numberValue(summary.conversions)} conversions`,
        },
        {
          label: 'Media spend',
          value: money(numberValue(summary.spend)),
          detail: `${numberValue(summary.campaigns)} campaigns`,
        },
        {
          label: 'Blended ROAS',
          value: `${numberValue(summary.roas).toFixed(2)}×`,
          detail: 'Workspace campaign aggregate',
        },
        {
          label: 'Customer profiles',
          value: numberValue(summary.customers).toLocaleString('en-IN'),
          detail: `${numberValue(summary.events).toLocaleString('en-IN')} canonical events`,
        },
      ]}
      notice={
        numberValue(summary.pendingApprovals) > 0
          ? `${numberValue(summary.pendingApprovals)} high-impact action(s) are waiting for an independent approval.`
          : null
      }
    >
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Top campaigns</h2>
              <p>Spend, revenue and delivery status</p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th>Spend</th>
                  <th>Revenue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((row) => (
                  <tr key={text(row.id)}>
                    <td>{text(row.name)}</td>
                    <td>{text(row.channel)}</td>
                    <td>{money(numberValue(row.spend))}</td>
                    <td>{money(numberValue(row.revenue))}</td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Connector health</h2>
              <p>Latest source reliability score</p>
            </div>
          </div>
          <div className="health-list">
            {connectors.map((row) => {
              const score = Math.max(0, Math.min(100, numberValue(row.healthScore)));
              return (
                <div className="health-row" key={text(row.id)}>
                  <div>
                    <strong>{text(row.name)}</strong>
                    <span>{score}/100</span>
                  </div>
                  <StatusBadge value={row.status} />
                  <div className="health-bar">
                    <i style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Governed activity</h2>
            <p>Recent user, system and AI evidence</p>
          </div>
        </div>
        <div className="activity-list">
          {activities.map((row) => (
            <div className="activity-item" key={text(row.id)}>
              <span className="activity-dot" />
              <div>
                <strong>{text(row.action)}</strong>
                <p>
                  {text(row.resourceType)} · {text(row.resourceId)}
                </p>
              </div>
              <time>{text(row.createdAt)}</time>
            </div>
          ))}
        </div>
      </section>
    </CapabilityPage>
  );
}
