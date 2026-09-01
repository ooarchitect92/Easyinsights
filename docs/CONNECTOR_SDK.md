# Connector adapter contract

A production connector adapter must implement:

1. Credential reference resolution through a secret manager; never return raw credentials to the UI.
2. OAuth renewal or key rotation with expiry diagnostics.
3. Historical backfill and incremental cursor semantics.
4. Provider rate-limit parsing, bounded retries and dead-letter handling.
5. Schema discovery, explicit field mapping and version monitoring.
6. Idempotent writes and provider-specific duplicate prevention.
7. Consent and identifier normalization required by the destination.
8. Partial-failure reporting with per-record response evidence.
9. Test/sandbox mode and dry-run preview.
10. Compensating or correction action for rollback.

The generic signed-webhook source is implemented. All other seeded providers intentionally report credential or adapter requirements until their reviewed adapter is installed.
