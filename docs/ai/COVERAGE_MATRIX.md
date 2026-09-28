# Requirement to file to test matrix

| Requirement                       | Implementation                                  | Evidence                                   |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Exact model assignments           | `packages/ai/src/registry/catalog.ts`           | `packages/ai/src/registry/catalog.test.ts` |
| Separate readiness states         | `packages/ai/src/registry/readiness.ts`         | registry unit test + AI admin UI           |
| Durable job acceptance            | `apps/web/src/app/api/v1/ai/analysis/route.ts`  | Mongo indexes + transactional outbox       |
| Provider call outside transaction | `apps/ai-worker/src/worker.ts`                  | explicit claim / execute / finalize phases |
| Lease and fencing                 | `apps/ai-worker/src/worker.ts`                  | CAS claim + fencing token                  |
| Unknown provider outcome          | `apps/ai-worker/src/worker.ts`                  | persisted `outcome_unknown`                |
| Tenant-scoped job status          | `apps/web/src/app/api/v1/ai/jobs/[id]/route.ts` | permission + tenant filter                 |
| Frontend visibility               | `apps/web/src/app/(app)/app/ai/*`               | build/browser evidence pending             |

| Tenant-scoped request idempotency | `apps/web/src/app/api/v1/ai/analysis/route.ts` | existing `idempotency_keys` uniqueness |
| Kafka + execution lease heartbeat | `apps/ai-worker/src/worker.ts` | heartbeat loop + fenced lease renewal |
| Expired running lease safety | `apps/ai-worker/src/worker.ts` | transitions to `outcome_unknown` instead of blind replay |
