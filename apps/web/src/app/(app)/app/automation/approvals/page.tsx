import { ApiActionButton } from '@/components/api-action-button';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Approvals() {
  const p = await requireServerPrincipal('approval:read');
  const rows = await listDocuments(p, 'approvals', 100, { createdAt: -1 });
  return (
    <CapabilityPage
      eyebrow="Human control"
      title="Approvals"
      description="Review evidence, impact, policy checks and rollback plans before high-impact agent, workflow or activation actions proceed."
      notice="High-risk approvals enforce four-eyes control: the requester cannot approve their own action."
      columns={[
        { key: 'title', label: 'Action' },
        { key: 'riskLevel', label: 'Risk', render: (r) => <StatusBadge value={r.riskLevel} /> },
        { key: 'requestedBy', label: 'Requester' },
        { key: 'predictedImpact', label: 'Predicted impact' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} /> },
        {
          key: 'id',
          label: 'Decision',
          render: (r) =>
            r.status === 'pending' ? (
              <span className="header-actions">
                <ApiActionButton
                  endpoint={`/api/v1/approvals/${text(r.id)}/decision`}
                  label="Approve"
                  body={{ decision: 'approved', reason: 'Evidence and policy checks reviewed.' }}
                />
                <ApiActionButton
                  endpoint={`/api/v1/approvals/${text(r.id)}/decision`}
                  label="Reject"
                  body={{ decision: 'rejected', reason: 'Rejected after evidence review.' }}
                />
              </span>
            ) : (
              '—'
            ),
        },
      ]}
      rows={rows}
    />
  );
}
