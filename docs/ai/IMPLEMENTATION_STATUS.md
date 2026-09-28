# Multi-model intelligence implementation status

Baseline commit: `d578bcb7930e21c765a40da8013c34d23cdbd6bd`

Working branch: `feature/multi-model-intelligence`

Baseline CI evidence: GitHub Actions run `36458377631` completed successfully for the baseline commit before implementation edits.

## Implemented in the first end-to-end slice

- Central task/model registry containing every requested assignment.
- Separate documentation verification, credential configuration, account-access verification and serving readiness.
- The exact Anthropic reviewer identifier `claude-fable-5-1` remains unavailable because current official documentation lists `claude-fable-5`; no silent substitution is made.
- OpenAI analyst provider code path, but live execution remains policy-blocked until endpoint/capability verification and account access are explicitly approved.
- Voyage embedding and rerank provider adapters using `voyage-4-large` and `rerank-2.5`.
- Tenant-scoped analysis submission and job-status APIs.
- Atomic job + usage reservation + outbox acceptance.
- Dedicated AI worker with short claim transaction, lease/fencing token, external provider execution outside MongoDB transactions, atomic finalization and explicit outcome-unknown handling.
- AI administration and analyst pages integrated into existing navigation.
- MongoDB indexes, Kafka command topic, Compose service and Docker target.

## Not yet claimed complete

Python ML service/training pipelines, point-in-time datasets, fitted artifacts, Chronos/Meridian/EconML/HDBSCAN/LightGBM execution, Google media/voice adapters, retrieval ingestion/vector search, evaluation/promotion APIs, remaining AI frontend workflows, Kubernetes assets and live-provider qualification remain pending.

Missing credentials block live qualification, not implementation. Hosted routes remain disabled by default.


## Reliability hardening added after the first slice

- Analysis submission now requires and persists through the existing tenant-scoped idempotency mechanism so a repeated client request cannot create a second logical job.
- The AI worker sends Kafka heartbeats while long execution is running and renews its MongoDB lease under the active fencing token.
- An expired `running` lease is treated as an externally ambiguous outcome and moved to `outcome_unknown` for reconciliation instead of blindly executing the provider call again.
