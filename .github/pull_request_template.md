## Summary

## Risk and tenant-isolation review

- [ ] Every business read/write includes `organizationId` and `workspaceId`.
- [ ] External actions are idempotent, consent-aware and policy-gated.
- [ ] Secrets are referenced, not logged or committed.
- [ ] MongoDB write and outbox event are atomic where required.

## Verification

- [ ] `npm run quality`
- [ ] `docker compose config`
- [ ] `kubectl kustomize deploy/kubernetes/overlays/production`

## Rollback

Describe the application, data and provider rollback path.
