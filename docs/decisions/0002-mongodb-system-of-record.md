# ADR 0002: MongoDB as initial system of record

Status: Accepted by product constraint

## Decision

Use MongoDB replica-set transactions as the authoritative product store. Use Redis only for caching/locks and Kafka for event distribution.

## Rationale

The requested stack requires MongoDB. Document storage fits flexible event, journey, workflow and agent evidence structures. Explicit collections, validation contracts, indexes and transaction boundaries avoid an ungoverned schemaless design.

## Consequences

- Transaction support requires a replica set
- Tenant filters and compound indexes are mandatory
- Analytical scale may later require ClickHouse or a customer warehouse
- Redis eviction cannot lose business data
