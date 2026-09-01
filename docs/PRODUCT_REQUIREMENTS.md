# Product Requirements Document

## Product statement

Easyinsights is an AI-native marketing intelligence, attribution and activation operating system for agencies and lead-generation businesses. It provides a trustworthy path from source data to customer identity, revenue attribution, governed recommendation and approved activation.

## Primary users

| Persona                        | Main outcome                                                 |
| ------------------------------ | ------------------------------------------------------------ |
| Agency owner                   | Portfolio visibility, client isolation and report automation |
| Marketing leader               | Revenue-based channel decisions and budget governance        |
| Performance marketer           | Campaign, audience and signal optimization                   |
| Marketing analyst              | Trusted canonical data, funnels, journeys and attribution    |
| Sales operations               | Lead quality, routing and CRM feedback                       |
| Data engineer                  | Reliable connectors, schemas, retries and reconciliation     |
| Privacy/security administrator | Consent, retention, access and audit evidence                |
| Platform operator              | Tenant, plan, usage, feature and incident controls           |

## Core journey

```text
Create organization and workspace
-> connect or simulate a source
-> receive/import events
-> validate and normalize
-> resolve identity
-> build customer journey
-> calculate quality and attribution
-> grade or segment customers
-> generate a governed recommendation/workflow
-> request approval when policy requires it
-> execute dry-run or credential-gated activation
-> observe outcome and audit evidence
```

## Functional requirements

### FR-01 SaaS control plane

- Organizations may contain multiple workspaces.
- Agency tenants may isolate client workspaces while viewing permitted portfolio summaries.
- Users may have organization-wide or workspace-scoped roles.
- Entitlements are evaluated from plan and subscription status.
- Usage is recorded by period and metric.
- Every material write produces an audit event.

Acceptance:

- A member cannot fetch another organization's object by guessing its ID.
- A workspace member cannot execute an organization-admin operation.
- Expired/revoked sessions are rejected even when a stale Redis value exists.

### FR-02 Connector hub

- Connectors support typed status, checkpoints, schema/mapping metadata and credential references.
- Sync requests are idempotent and asynchronous.
- Failures contain provider-neutral classification and evidence.
- Real provider calls require credentials; demo mode must be visibly labelled.

### FR-03 Event collection

- Accept canonical REST events and signed webhook events.
- Preserve original payload and normalized representation.
- Deduplicate by event ID and idempotency key.
- Validate consent and campaign references.
- Queue asynchronous processing transactionally.

### FR-04 Data quality

- Detect missing campaign identifiers, invalid UTM/currency/timezone, duplicates, null identity, source delay and activation rejection.
- Assign severity, evidence, impact and remediation status.
- Produce a connector/source health score.
- Never silently change a high-impact mapping.

### FR-05 Customer 360

- Resolve supported identifiers to a unified profile.
- Show merge evidence and confidence.
- Preserve first/latest touch, stage, score, value and journey.
- Support future manual merge/split and privacy requests.

### FR-06 Journey and funnel

- Present ordered touchpoints across online/offline sources.
- Calculate conversion duration and funnel stage counts.
- Compare paths by campaign, region, product and owner.
- Identify the highest drop-off stage.

### FR-07 Attribution

- Support first, last, last-non-direct, linear, time-decay and position-based models initially.
- Version every model/run.
- Reconcile total credit to conversion value.
- Explain which touchpoints received credit and why.

### FR-08 Campaign intelligence

- Model channel/account/campaign/ad group/ad/creative hierarchy.
- Provide spend, lead, conversion, revenue, CPL, CPA and ROAS measures.
- Show source freshness and data-quality caveats.

### FR-09 Audiences

- Build nested AND/OR rule groups.
- Preview selection/exclusion and consent impact.
- Store evaluated membership and reason.
- Require approval for live external synchronization where policy requires.

### FR-10 Agents

- Support advisory, approval and policy-bound autonomous modes.
- Record inputs, evidence, output, confidence, model and policy result.
- Prohibit direct provider credential access by the model.
- Use deterministic analysis when no model endpoint is configured.

### FR-11 Workflows

- Support triggers, conditions, transformations, agent steps, approval, actions and notification nodes.
- Version definitions and persist node execution history.
- Resume once after approval without repeating the same approval node.
- Support dry run, idempotency and failure classification.

### FR-12 Activations

- Default to dry run.
- Validate consent, permission, policy, approval and destination configuration.
- Persist request, attempt, provider response and terminal state.
- Block live execution unless deployment explicitly enables it.

### FR-13 Reporting and agency controls

- Provide tenant/client dashboards and scheduled report records.
- Support white-label metadata and custom domain foundation.
- Keep client data isolated.
- Track report evidence period and freshness.

### FR-14 Privacy and governance

- Purpose-specific consent ledger.
- Retention rules and MongoDB TTL for eligible records.
- Customer export/correction/deletion workflow foundation.
- Append-only, tamper-evident audit chain.
- Secret references and encrypted PII handling.

## Non-functional requirements

| Area          | Requirement                                                             |
| ------------- | ----------------------------------------------------------------------- |
| Availability  | Independently scalable stateless web and worker replicas                |
| Durability    | Business command and outbox written in one transaction                  |
| Performance   | Cached dashboard p95 target below 500 ms under agreed load              |
| Scalability   | Kafka partitioned by workspace/profile for ordered processing           |
| Security      | OWASP-aligned validation, authorization, secret and container controls  |
| Privacy       | Configurable purpose, retention, deletion and regional controls         |
| Observability | Correlation IDs, structured logs, probes, lag and error metrics         |
| Testability   | Unit, component, contract, build and manifest gates in CI               |
| Portability   | Containers and Kustomize overlays; no cloud-specific runtime dependency |
| Accessibility | Semantic navigation, keyboard operation and visible focus styles        |

## MVP acceptance scenario

Given a tenant administrator with a workspace, when a qualified-lead event is submitted twice with the same event ID and idempotency key, then exactly one canonical event is stored, an outbox message is eventually published, one customer journey is updated, attribution is calculable, a quality result is visible, an audience may select the profile, and any external activation remains dry-run or awaits approval unless all live gates pass.
