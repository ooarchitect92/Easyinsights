# MongoDB data model

## Common fields

Tenant-owned collections use `id`, `organizationId`, `workspaceId`, `createdAt` and domain-specific lifecycle fields. Sensitive records carry `dataClassification`.

## Principal collections

| Domain              | Collections                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Identity and access | `organizations`, `workspaces`, `users`, `memberships`, `sessions`                                                         |
| Connections         | `connectors`, `connector_runs`, `webhook_replays`                                                                         |
| Events              | `raw_events`, `canonical_events`, `schema_versions`, `usage_events`                                                       |
| Customer data       | `customer_profiles`, `identity_decisions`, `consent_ledger`, `journeys`                                                   |
| Marketing           | `campaigns`, `creatives`, `spend_facts`, `calls`, `experiments`                                                           |
| Measurement         | `funnel_results`, `attribution_runs`, `attribution_credits`, `incrementality_results`, `forecasts`                        |
| Audiences           | `segments`, `audiences`, `audience_runs`, `audience_memberships`                                                          |
| Automation          | `agents`, `agent_runs`, `workflows`, `workflow_versions`, `workflow_runs`, `approvals`, `activation_runs`                 |
| Operations          | `outbox`, `processed_messages`, `message_failures`, `dead_letters`, `quality_findings`, `alerts`, `reports`, `audit_logs` |
| Commercial          | `subscriptions`, `usage_monthly`                                                                                          |

## Raw and canonical event lineage

`raw_events` stores the received payload for a configurable retention window. `canonical_events` stores validated fields, transformation version, hashed identifiers, source reference, profile decision and processing state. Downstream records reference the canonical event ID.

## Audit integrity

Each audit entry stores `sequence`, `previousHash` and `entryHash`. This makes deletion or reordering detectable. For stronger immutability, production should additionally export audit batches to WORM-capable object storage or an external ledger.

## Indexes

`scripts/create-indexes.ts` creates deterministic unique, lookup and TTL indexes. It is safe to rerun during deployment.
