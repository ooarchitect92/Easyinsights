# ADR 0003: Transactional outbox for Kafka publication

Status: Accepted

## Decision

Persist a command's business state and its outbox message in one MongoDB transaction. Publish asynchronously with leases and idempotent Kafka producer semantics.

## Rationale

Directly writing MongoDB and Kafka in one request creates an unrecoverable dual-write gap. The outbox permits retry after process or broker failure.

## Consequences

- Eventual rather than immediate downstream processing
- Outbox lag is a primary SLO
- Consumers must be idempotent because Kafka delivery can repeat
