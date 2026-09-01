# Deployment

## Local stack

Docker Compose starts MongoDB 8 as a single replica set, Redis with bounded LRU, Kafka 4 in KRaft mode, one bootstrap job, Next.js web, an outbox worker and a consumer worker.

```bash
cp .env.example .env
npm run compose:up
docker compose ps
npm run smoke
```

## Kubernetes

The production overlay expects managed MongoDB, Redis and Kafka endpoints supplied through `easyinsights-secrets`. Web, outbox and consumer Deployments have probes, requests/limits, rolling updates, disruption budgets and HPAs.

Replace image tags, hostname and TLS secret before applying. Run the bootstrap Job for indexes and topics. Production seeding is blocked unless explicitly enabled and is not part of the Kubernetes Job.

## Database requirements

MongoDB must be a replica set or sharded cluster because the event pipeline depends on transactions. Backups must include point-in-time recovery and tested restore procedures.

## Kafka requirements

Disable automatic topic creation. Provision topics from `scripts/create-topics.ts`. Production replication factor must be increased from the one-broker local setting according to the managed cluster topology.
