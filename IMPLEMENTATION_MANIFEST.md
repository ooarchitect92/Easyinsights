# EasyInsights Implementation Manifest

Generated: 2026-08-31T20:36:09.639092+00:00

## Delivery summary

This repository implements a production-oriented, multi-tenant marketing intelligence and activation platform as a domain-driven Next.js modular monolith with independently scalable Kafka workers.

- Source/configuration files in release archive: **177**
- Approximate text lines across source, infrastructure, and documentation: **2,282**
- Primary runtime: Next.js, React, TypeScript, MongoDB replica-set transactions, Kafka, Redis TTL/LRU, Docker, and Kubernetes.
- Persistence pattern: MongoDB system of record plus transactional outbox; Redis is non-authoritative cache and distributed coordination.
- Multi-tenancy: organization/workspace scoping, role permissions, object-level authorization helpers, and tenant-bound audit records.
- Security: opaque database-backed sessions, scrypt password hashing, encrypted connector-secret envelope support, request idempotency, signed webhooks, rate limits, immutable hash-chained audit records, consent checks, retention indexes, non-root/read-only containers, and fail-closed activation.

## Implemented product domains

### SaaS control plane

Organizations, workspaces, memberships, role-based authorization, subscriptions, entitlements, usage metering, platform administration, feature-state visibility, and audit history.

### Data and connector plane

Connector registry and health, credential-envelope model, connector run commands, canonical and raw event ingestion, schema registry, webhook verification, quality findings, identity decisions, and event exploration.

### Customer and measurement plane

Customer 360, identity stitching, journey timelines, funnels, campaign hierarchy, first-touch/last-touch/linear/time-decay/position-based attribution contracts and worker execution, quality observability, and alerts.

### Activation and automation plane

Audience rules and consent-aware evaluation, durable memberships, dry-run activation, approval-gated live actions, workflow definitions and execution, governed agents, approvals, reports, and run history.

### Operations

MongoDB index and seed bootstrap, explicit Kafka topic provisioning, bounded Redis allkeys-LRU configuration, transactional-outbox publishing, idempotent consumers, retry and dead-letter persistence, health/readiness endpoints, local Compose stack, Kubernetes base/production overlay, HPA/PDB/network policies, CI, CodeQL, dependency review, image publication workflow, SBOM/provenance settings, runbooks, and threat/test documentation.

## Deliberate external boundaries

The repository includes contracts, storage, command orchestration, safety gates, diagnostic workflows, and adapter extension points for Meta, Google, GA4, CRM, telephony, messaging, billing, and AI providers. It does **not** claim a verified live provider connection because OAuth applications, tokens, business verification, phone numbers, payment accounts, external model credentials, and customer consent/configuration were not supplied.

## Validation

GitHub Actions validates repository structure, formatting, linting, TypeScript, unit tests, production builds, Docker Compose rendering, Kubernetes rendering, container builds, dependency review and CodeQL. Machine-specific build logs are intentionally not committed.
