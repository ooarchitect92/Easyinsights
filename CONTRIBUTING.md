# Contributing

Use a short-lived branch and a pull request. Run `npm run quality`, render Compose and Kubernetes manifests, and document rollback for every behavior change.

Every tenant-owned read/write must include authenticated organization and workspace scope. External actions require idempotency, consent, evidence, approval policy and a provider-specific rollback. Never commit credentials or use generated placeholder output as proof of a working integration.
