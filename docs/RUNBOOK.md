# Operations runbook

## Health

- Web liveness: `/api/health/live`
- Web readiness: `/api/health/ready`
- Worker liveness: `/health/live`
- Worker readiness: `/health/ready`

Readiness checks MongoDB, Redis and Kafka from the web. Workers check MongoDB and Redis; Kafka connection lifecycle is reflected in process health and logs.

## Outbox backlog

Inspect pending/failed outbox records by `availableAt`, `attempts` and `lastError`. Scale outbox workers if publication lag rises. Do not manually mark a row published without confirming the Kafka delivery.

## Consumer failures

Each failed attempt is stored in `message_failures`. After five attempts, evidence is stored in `dead_letters` and a compactable DLQ topic receives a summary. Correct the cause, create a new reviewed replay command and preserve the original evidence.

## Redis loss

No business data recovery is required. Restart Redis and allow cache-aside loads to repopulate keys. Expect temporary database load.

## Connector incident

Pause the connector, preserve its cursor and diagnostics, rotate credentials if exposure is suspected, verify provider rate limits and run a sandbox sync before resuming.

## Activation incident

Disable `LIVE_ACTIVATION_ENABLED`, pause destination connectors, identify affected idempotency keys, follow the provider-specific correction or suppression workflow and record an incident plus audit evidence.
