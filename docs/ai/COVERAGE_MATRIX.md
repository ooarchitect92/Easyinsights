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

| Anthropic reviewer adapter | `packages/ai/src/providers/anthropic/messages.ts` | mocked provider contract test; exact model remains docs-blocked |
| Google multimodal/transcription/image adapters | `packages/ai/src/providers/google/generate.ts` | mocked provider contract tests |
| Google Live voice transport | `packages/ai/src/providers/google/live.ts` | implementation present; live provider smoke test still required |
| Provider verification report | `scripts/ai/verify-providers.ts` | `npm run ai:verify-providers` |

| Internal ML service authentication | `apps/ml-service/src/easyinsights_ml/auth.py` | `apps/ml-service/tests/test_service.py` |
| Seasonal-naive forecast baseline | `apps/ml-service/src/easyinsights_ml/models/forecasting/seasonal_naive.py` | unit + authenticated API test |

| Forecast durable submission | `apps/web/src/app/api/v1/ai/forecast/route.ts` | idempotent job/outbox acceptance |
| Forecast worker execution | `packages/ai/src/providers/ml-service/client.ts`, `apps/ai-worker/src/worker.ts` | external execution outside MongoDB transaction |

| Exact event semantic mapping | `apps/worker/src/handlers/canonical.ts` | `apps/worker/src/handlers/canonical.test.ts` |
| Out-of-order first/last timestamps | `apps/worker/src/handlers/canonical.ts` | monotonic timestamp logic; integration coverage still pending |
| Historical conversion preservation | `apps/worker/src/handlers/canonical.ts` | conversion state is monotonic; integration coverage still pending |
| Observed vs estimated value separation | `apps/worker/src/handlers/canonical.ts` | observed revenue and estimated deal value stored separately |
