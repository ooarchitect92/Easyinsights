import { notFound } from 'next/navigation';
import { CapabilityPage, StatusBadge } from '@/components/capability-page';
import { requireServerPrincipal } from '@/server/auth';
import { listDocuments, oneDocument, numberValue, text } from '@/server/data';
export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await requireServerPrincipal('customer:read');
  const customer = await oneDocument(p, 'customer_profiles', id);
  if (!customer) notFound();
  const events = (await listDocuments(p, 'canonical_events', 100, { eventTime: -1 })).filter(
    (r) => r.profileId === id || r.customerId === customer.externalId,
  );
  return (
    <CapabilityPage
      eyebrow="Customer 360"
      title={text(customer.displayName, 'Anonymous customer')}
      description="Explainable identity, consent and journey evidence for one unified profile."
      metrics={[
        { label: 'Lead score', value: numberValue(customer.leadScore) },
        { label: 'Lead grade', value: text(customer.leadGrade) },
        {
          label: 'Lifetime value',
          value: `₹${numberValue(customer.lifetimeValue).toLocaleString('en-IN')}`,
        },
        { label: 'Journey events', value: events.length },
      ]}
    >
      <div className="split-panels">
        <section className="panel">
          <div className="panel-header">
            <h2>Profile and consent</h2>
          </div>
          <div className="definition-grid">
            <div className="definition-card">
              <h3>Stage</h3>
              <StatusBadge value={customer.stage} />
            </div>
            <div className="definition-card">
              <h3>First touch</h3>
              <p>{text(customer.firstTouchSource)}</p>
            </div>
            <div className="definition-card">
              <h3>Latest touch</h3>
              <p>{text(customer.latestTouchSource)}</p>
            </div>
          </div>
          <pre className="code-block">
            {JSON.stringify(
              {
                traits: customer.traits,
                consent: customer.consent,
                identityEvidence: customer.identityEvidence,
              },
              null,
              2,
            )}
          </pre>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Recent journey</h2>
          </div>
          <div className="activity-list">
            {events.slice(0, 12).map((event) => (
              <div className="activity-item" key={text(event.id)}>
                <span className="activity-dot" />
                <div>
                  <strong>{text(event.eventName)}</strong>
                  <p>
                    {text(event.source)} · {text(event.processingStatus)}
                  </p>
                </div>
                <time>{text(event.eventTime)}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </CapabilityPage>
  );
}
