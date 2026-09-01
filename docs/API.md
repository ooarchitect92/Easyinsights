# Versioned API

Base path: `/api/v1`.

## Authentication

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

The server issues an opaque, HTTP-only, SameSite=Strict session cookie. The token is hashed before database storage.

## Core resources

- `GET /dashboard`
- `GET|POST /connectors`
- `POST /connectors/:id/sync`
- `GET|POST /events`
- `POST /webhooks/:connectorId`
- `GET /campaigns`
- `GET /customers` and `GET /customers/:id`
- `GET /journeys`
- `GET /data-quality`
- `GET|POST /attribution/runs`
- `GET|POST /audiences`
- `POST /audiences/:id/activate`
- `GET|POST /workflows`
- `POST /workflows/:id/execute`
- `GET|POST /agents`
- `POST /agents/:id/execute`
- `GET /approvals`
- `POST /approvals/:id/decision`
- `GET|POST /activations`
- `GET|POST /reports`
- `GET /billing/subscription`
- `GET /alerts`, `/audit`, `/organizations`

## Request guarantees

- Tenant scope comes from the authenticated principal or connector record.
- Mutation routes enforce same-origin requests except signed webhooks.
- Event and activation requests use idempotency keys.
- Validation errors return 422 with field details.
- Responses contain `requestId` and `generatedAt`.
- Asynchronous requests return durable run IDs rather than claiming immediate provider completion.

## Signed webhook

Signature input is `<unix-milliseconds>.<raw-body>` using HMAC-SHA256 and `WEBHOOK_SIGNING_SECRET`.

```text
X-EI-Timestamp: 1788254400000
X-EI-Signature: hexadecimal-hmac
```

The accepted clock skew is five minutes. A replay key is stored with TTL.
