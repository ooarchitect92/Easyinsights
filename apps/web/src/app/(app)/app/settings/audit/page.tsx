import { CapabilityPage } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, text } from '@/server/data';
export default async function Audit() {
  const p = await requireServerPrincipal('audit:read');
  const rows = await listDocuments(p, 'audit_logs', 100, { sequence: -1 });
  return (
    <CapabilityPage
      eyebrow="Immutable evidence"
      title="Audit trail"
      description="Review hash-chained user, system and AI activity with actor, resource, request and sequence evidence."
      metrics={[
        { label: 'Visible entries', value: rows.length },
        { label: 'Latest sequence', value: text(rows[0]?.sequence, '0') },
        { label: 'Chain origin', value: text(rows.at(-1)?.previousHash, 'GENESIS') },
        { label: 'Classification', value: 'Internal' },
      ]}
      columns={[
        { key: 'sequence', label: 'Sequence' },
        { key: 'action', label: 'Action' },
        { key: 'actorId', label: 'Actor' },
        { key: 'resourceType', label: 'Resource' },
        { key: 'resourceId', label: 'Resource ID' },
        { key: 'requestId', label: 'Request ID' },
        {
          key: 'entryHash',
          label: 'Entry hash',
          render: (r) => text(r.entryHash).slice(0, 16) + '…',
        },
        { key: 'createdAt', label: 'Occurred', render: (r) => text(r.createdAt) },
      ]}
      rows={rows}
    />
  );
}
