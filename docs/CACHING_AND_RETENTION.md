# Caching and retention

## Cache hierarchy

1. Process-local `LRUCache`: maximum 1,000 serialized entries, short TTL, updated on read.
2. Redis: shared cache with explicit per-key TTL.
3. MongoDB: authoritative source.

The cache-aside loader collapses concurrent misses inside one process. Redis failure degrades performance, not correctness. Application writes invalidate the relevant tenant dashboard prefix.

## Redis eviction

Local Compose sets `maxmemory 256mb` and `maxmemory-policy allkeys-lru`. Redis persistence is disabled because sessions, idempotency and business records are stored in MongoDB. Production Redis should be isolated from unrelated durable workloads.

## MongoDB TTL

| Record                          | Default lifecycle |
| ------------------------------- | ----------------: |
| Session                         |           8 hours |
| Raw event payload               |           90 days |
| API idempotency result          |          24 hours |
| Webhook replay key              |        10 minutes |
| Outbox publication history      |           14 days |
| Worker run and retry evidence   |           90 days |
| Processed-message deduplication |           90 days |
| Audience membership snapshot    |           90 days |

TTL deletion is asynchronous and must not be used for immediate access revocation. Revoked sessions are rejected by status before TTL cleanup.

## Data retention policy

Production should calculate `expiresAt` from workspace purpose, data class, contract and jurisdiction. Legal hold must remove or override expiration before a TTL index can delete the record.
