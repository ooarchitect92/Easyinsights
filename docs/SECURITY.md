# Security design

## Implemented controls

- Opaque database-backed sessions, scrypt password hashing with deployment pepper and session TTL/revocation.
- Tenant filters from authenticated scope; RBAC permission checks on API boundaries.
- Same-origin mutation checks, rate limits, signed webhooks and replay protection.
- Identifier normalization and SHA-256 hashing before advertising-oriented storage or delivery.
- Approval and four-eyes enforcement for high-risk actions.
- Hash-chained audit trail for user, system and AI actions.
- Non-root containers, read-only filesystems, dropped capabilities, restricted pod security and network policies.
- Secrets referenced by environment/secret manager; repository scanning rejects common credential patterns.
- Live activation disabled by default and blocked without a provider-specific adapter.

## Required before public production

Conduct threat modelling, penetration testing, dependency/SBOM review, backup restore testing, privacy impact assessment, provider security review, incident exercises and legal review for the jurisdictions served. Use managed key management for credential encryption and WORM export for regulated audit retention.

Do not claim DPDP, GDPR, CCPA, SOC 2 or ISO certification solely because technical controls exist.
