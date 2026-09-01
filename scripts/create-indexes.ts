import { closeMongo, getDb } from '@easyinsights/core';
const db = await getDb();
const definitions: Record<
  string,
  Array<{ keys: Record<string, 1 | -1>; options?: Record<string, unknown> }>
> = {
  organizations: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { slug: 1 }, options: { unique: true } },
  ],
  workspaces: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, slug: 1 }, options: { unique: true } },
  ],
  users: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { email: 1 }, options: { unique: true } },
  ],
  memberships: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { userId: 1, organizationId: 1, workspaceId: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1 } },
  ],
  sessions: [
    { keys: { tokenHash: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
    { keys: { userId: 1, workspaceId: 1 } },
  ],
  connectors: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, provider: 1, status: 1 } },
  ],
  connector_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  raw_events: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, receivedAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  canonical_events: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, eventId: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, eventName: 1, eventTime: -1 } },
    { keys: { organizationId: 1, workspaceId: 1, customerId: 1, eventTime: -1 } },
    { keys: { organizationId: 1, workspaceId: 1, anonymousId: 1, eventTime: -1 } },
  ],
  idempotency_keys: [
    { keys: { organizationId: 1, workspaceId: 1, key: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  webhook_replays: [
    { keys: { key: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  outbox: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { status: 1, availableAt: 1, lockedUntil: 1, createdAt: 1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  processed_messages: [
    { keys: { messageId: 1 }, options: { unique: true } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  message_failures: [
    { keys: { organizationId: 1, workspaceId: 1, messageId: 1, attempt: 1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  dead_letters: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  customer_profiles: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, primaryEmailHash: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, primaryPhoneHash: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, externalIds: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, anonymousIds: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, lastSeenAt: -1 } },
  ],
  identity_decisions: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, profileId: 1, createdAt: -1 } },
  ],
  journeys: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, profileId: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, converted: 1, lastTouchAt: -1 } },
  ],
  quality_findings: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, severity: 1, createdAt: -1 } },
  ],
  campaigns: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, channel: 1, status: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, externalId: 1 } },
  ],
  creatives: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, campaignId: 1, updatedAt: -1 } },
  ],
  spend_facts: [
    { keys: { organizationId: 1, workspaceId: 1, date: -1, channel: 1, campaignId: 1 } },
  ],
  attribution_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  attribution_credits: [
    { keys: { organizationId: 1, workspaceId: 1, runId: 1, source: 1 } },
    { keys: { organizationId: 1, workspaceId: 1, profileId: 1 } },
  ],
  audiences: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1 } },
  ],
  audience_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  audience_memberships: [
    {
      keys: { organizationId: 1, workspaceId: 1, audienceId: 1, profileId: 1 },
      options: { unique: true },
    },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  workflows: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1 } },
  ],
  workflow_versions: [
    {
      keys: { organizationId: 1, workspaceId: 1, workflowId: 1, version: 1 },
      options: { unique: true },
    },
  ],
  workflow_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  agents: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, type: 1, enabled: 1 } },
  ],
  agent_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  approvals: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  activation_runs: [
    { keys: { id: 1 }, options: { unique: true } },
    {
      keys: { organizationId: 1, workspaceId: 1, idempotencyKey: 1 },
      options: { unique: true, sparse: true },
    },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  reports: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, createdAt: -1 } },
    { keys: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },
  ],
  alerts: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, status: 1, severity: 1, createdAt: -1 } },
  ],
  audit_logs: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, sequence: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, createdAt: -1 } },
  ],
  subscriptions: [{ keys: { organizationId: 1, workspaceId: 1 }, options: { unique: true } }],
  usage_monthly: [
    { keys: { organizationId: 1, workspaceId: 1, periodStart: 1 }, options: { unique: true } },
  ],
  usage_events: [{ keys: { organizationId: 1, workspaceId: 1, metric: 1, occurredAt: -1 } }],
  consent_ledger: [
    { keys: { id: 1 }, options: { unique: true } },
    { keys: { organizationId: 1, workspaceId: 1, profileId: 1, purpose: 1, capturedAt: -1 } },
  ],
};
for (const [collection, indexes] of Object.entries(definitions)) {
  for (const index of indexes) {
    await db.collection(collection).createIndex(index.keys, index.options ?? {});
  }
}
console.log(JSON.stringify({ status: 'ok', collections: Object.keys(definitions).length }));
await closeMongo();
