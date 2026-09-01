# Implementation status

## Operational MVP

- Multi-tenant organizations, workspaces, users, roles and database-backed sessions.
- Connector catalog, signed webhook ingestion and connector-run diagnostics.
- Raw/canonical event lineage, identity resolution, Customer 360, journeys and quality findings.
- Campaign, spend, creative, funnel and customer views backed by tenant collections.
- First-touch, last-touch, last-non-direct, linear, time-decay and position-based attribution weighting foundation.
- Consent-aware audience evaluation and durable membership snapshots.
- Versioned workflows with approval pauses and resumable execution.
- Governed deterministic agents with evidence, confidence and approval creation.
- Reports, subscriptions, usage metering, alerts and hash-chained audit.
- Transactional outbox, Kafka workers, retries, deduplication and dead letters.
- Redis/local TTL-LRU cache and MongoDB TTL lifecycle indexes.
- Docker Compose, Kubernetes, CI, image publication and security workflows.

## Adapter-gated

These domains have models, UI, run history and safety boundaries, but require production provider adapters and customer credentials before they are operational:

- Meta Ads/CAPI and Custom Audiences
- Google Ads Enhanced Conversions and Customer Match
- GA4 Measurement Protocol
- HubSpot, Salesforce, Zoho and LeadSquared write-back
- LinkedIn and TikTok destinations
- Twilio and Exotel call tracking
- Email, SMS and WhatsApp business messaging
- Payment checkout and tax invoicing
- External generative-AI providers

## Planned analytical expansion

Marketing mix modelling, automated incrementality analysis, marginal ROAS curves, production forecasting, creative media understanding, voice qualification, private model hosting, SCIM and multi-region data planes remain later phases. The repository does not label these as completed.
