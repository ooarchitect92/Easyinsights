# Architecture

## Decision

Easyinsights is a modular Next.js product with event-driven worker processes. MongoDB is the authoritative system of record. Redis accelerates reads and coordinates ephemeral limits. Kafka carries durable domain and command messages after a transactional outbox commit.

## Runtime topology

| Runtime         | Responsibility                                                                                        | Scaling unit         |
| --------------- | ----------------------------------------------------------------------------------------------------- | -------------------- |
| Web             | Public site, authentication, tenant UI, versioned APIs and ingestion                                  | HTTP requests        |
| Outbox worker   | Claims committed outbox rows and publishes an idempotent Kafka envelope                               | Pending outbox depth |
| Consumer worker | Identity, journeys, quality, attribution, audiences, workflows, agents, reports and activation policy | Kafka lag            |
| Bootstrap       | MongoDB indexes and Kafka topic provisioning; local-only seed                                         | One-shot job         |

## Control plane

Organizations, workspaces, memberships, roles, subscriptions, entitlements, agents, workflows, policies and approvals form the control plane.

## Data plane

Raw events, canonical events, profiles, identity decisions, journeys, campaign facts, attribution credits, audience memberships and activation runs form the data plane.

## Consistency boundary

For asynchronous commands, the API commits both business state and an outbox record in one MongoDB replica-set transaction. Publication can be retried without recreating the business record. Consumers use `processed_messages` as an idempotency ledger and schedule a new outbox delivery with an incremented attempt after bounded failures.

## Multi-tenancy

Every tenant-owned document includes `organizationId` and `workspaceId`. API and worker filters are constructed from authenticated or message-envelope scope, never from a client-provided workspace alone. Unique indexes include tenant keys where IDs are not globally deterministic.

## Provider boundary

A connector record is configuration, not proof of a working integration. Live adapters must implement provider-specific OAuth/credential handling, rate limits, backfill cursors, idempotency, partial failures, consent mapping, diagnostics and rollback. The MVP worker records `production_provider_adapter_required` instead of issuing a generic HTTP request.

## Growth path

High-volume analytical facts can later be replicated into ClickHouse without changing the MongoDB control plane. Long-running workflows can migrate to Temporal after execution volume justifies it. The current workflow model and command envelopes preserve that seam.
