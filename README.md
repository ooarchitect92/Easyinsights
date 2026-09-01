# Easyinsights Marketing OS

An independent, AI-native, multi-tenant marketing intelligence, attribution and activation platform for agencies and lead-generation businesses. It is inspired by the market problem of disconnected marketing and revenue data; it is not a copy of another product's design or source code.

## What is implemented

The repository contains a production-oriented MVP and extensible foundation:

- Responsive public site, secure sign-in and tenant application covering data, Customer 360, marketing, measurement, automation, reporting, billing and administration.
- MongoDB as the authoritative system of record, including organization/workspace isolation, opaque sessions, raw and canonical events, identity decisions, journeys, attribution, audiences, agents, workflows, approvals, activations and hash-chained audit evidence.
- Transactional outbox: business state and an event-delivery record commit in the same MongoDB transaction before Kafka publication.
- Kafka data plane with independently scalable outbox and consumer workers, bounded retries, processed-message deduplication and durable dead-letter storage.
- Two-tier cache: process-local LRU plus Redis per-key TTL. MongoDB remains authoritative; Redis eviction cannot lose business records.
- MongoDB TTL indexes for sessions, raw events, idempotency, replay protection, outbox history, execution history, memberships and operational evidence.
- Approval and four-eyes controls for live or high-risk action requests.
- Docker Compose for a complete local environment and Kubernetes resources for stateless production workloads.
- CI, image builds, CodeQL, dependency review, validation, tests and quality evidence.

Provider-specific OAuth applications and live Meta, Google, CRM, telephony, billing or voice adapters require customer-owned credentials, provider review and deployment configuration. The repository refuses generic outbound customer-data delivery and defaults every activation path to dry-run or approval.

## Architecture

```text
Browser / SDK / Signed webhook / CRM import
                    │
                    ▼
          Next.js application + API
                    │
       MongoDB transaction boundary
        ┌───────────┴────────────┐
        ▼                        ▼
  Business record          Outbox record
                                 │
                                 ▼
                         Outbox publisher
                                 │
                                 ▼
                               Kafka
                                 │
          ┌──────────────────────┼───────────────────────┐
          ▼                      ▼                       ▼
  Identity + journey       Attribution + quality   Agents + workflows
          │                      │                       │
          └──────────────────────┼───────────────────────┘
                                 ▼
                   Approval-gated activation record
                                 │
                       Reviewed provider adapter
```

The implementation starts as a domain-driven modular product with separate data-plane processes. This avoids premature microservice fragmentation while allowing web, outbox and consumer capacity to scale independently.

## Stack

- Next.js 16, React 19 and TypeScript
- MongoDB replica set
- Redis with bounded `allkeys-lru`
- Apache Kafka in KRaft mode
- Docker and Kubernetes/Kustomize
- Vitest, ESLint, Prettier and GitHub Actions

## Local development

Requirements: Node.js 22+, npm 11+, Docker with Compose.

```bash
cp .env.example .env
# Replace development secrets in .env.
npm install
npm run quality
npm run compose:up
```

Open `http://localhost:3000` after all services are healthy.

Development seed account:

```text
Email:    admin@easyinsights.local
Password: ChangeMe-Strong-2026!
```

Override both with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Never use the sample password outside local development.

Useful commands:

```bash
npm run dev             # web + outbox + consumer against existing dependencies
npm run bootstrap       # create indexes/topics and seed local demonstration data
npm run smoke           # authenticated API smoke test against a running stack
npm run quality         # validation, formatting, lint, typecheck, tests and build
npm run compose:logs    # follow application logs
npm run compose:down    # remove local services and volume
```

## API examples

Ingest a canonical event after signing in:

```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: event-from-crm-123' \
  -H 'Cookie: ei_session=REDACTED' \
  -d '{
    "eventId": "crm-qualified-123",
    "eventName": "qualified_lead",
    "eventTime": "2026-09-01T12:00:00Z",
    "source": "crm",
    "customerId": "crm-123",
    "campaign": {"source":"google","medium":"cpc","campaignId":"campaign-1"},
    "properties": {"estimatedValue":25000},
    "consent": {"analytics":true,"advertising":true}
  }'
```

See [docs/API.md](docs/API.md) for route boundaries and [docs/CONNECTOR_SDK.md](docs/CONNECTOR_SDK.md) for signed webhooks and adapter requirements.

## Production deployment

Production manifests expect externally managed MongoDB, Redis and Kafka. Create `easyinsights-secrets` through a secret manager; do not commit credentials.

```bash
kubectl kustomize deploy/kubernetes/overlays/production
kubectl apply -k deploy/kubernetes/overlays/production
```

Before enabling any live activation:

1. Implement and review a provider-specific adapter.
2. Map provider consent and identifier requirements.
3. Configure idempotency, partial-failure diagnostics and rollback.
4. Add a credential reference backed by a secret manager.
5. Require approval and test in the provider sandbox.
6. Enable deployment policy only after operational sign-off.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Data model](docs/DATA_MODEL.md)
- [Caching and retention](docs/CACHING_AND_RETENTION.md)
- [API](docs/API.md)
- [Security](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Runbook](docs/RUNBOOK.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Connector SDK](docs/CONNECTOR_SDK.md)

## License and naming

No third-party proprietary code, private API credential or copied visual design is included. Confirm product naming, trademarks and licensing before commercial release.
