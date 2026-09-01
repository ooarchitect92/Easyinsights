import { z } from 'zod';

export const roles = [
  'platform_admin',
  'organization_admin',
  'workspace_admin',
  'marketer',
  'analyst',
  'sales',
  'finance',
  'viewer',
] as const;
export const roleSchema = z.enum(roles);
export type Role = z.infer<typeof roleSchema>;

export const permissions = [
  'organization:read',
  'organization:write',
  'workspace:read',
  'workspace:write',
  'member:read',
  'member:write',
  'connector:read',
  'connector:write',
  'event:read',
  'event:write',
  'customer:read',
  'customer:write',
  'campaign:read',
  'campaign:write',
  'measurement:read',
  'measurement:write',
  'audience:read',
  'audience:write',
  'workflow:read',
  'workflow:write',
  'agent:read',
  'agent:execute',
  'approval:read',
  'approval:decide',
  'activation:read',
  'activation:write',
  'report:read',
  'report:write',
  'billing:read',
  'billing:write',
  'audit:read',
  'platform:admin',
] as const;
export const permissionSchema = z.enum(permissions);
export type Permission = z.infer<typeof permissionSchema>;

export const tenantScopeSchema = z.object({
  organizationId: z.string().min(1),
  workspaceId: z.string().min(1),
});
export type TenantScope = z.infer<typeof tenantScopeSchema>;
export const principalSchema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  tenant: tenantScopeSchema,
  roles: z.array(roleSchema),
  permissions: z.array(permissionSchema),
});
export type Principal = z.infer<typeof principalSchema>;

export const dataClassificationSchema = z.enum([
  'public',
  'internal',
  'confidential',
  'restricted',
]);
export const consentSchema = z.object({
  analytics: z.boolean().default(false),
  advertising: z.boolean().default(false),
  source: z.string().max(120).optional(),
  capturedAt: z.coerce.date().optional(),
});
export const campaignReferenceSchema = z.object({
  source: z.string().max(80).optional(),
  medium: z.string().max(80).optional(),
  campaignId: z.string().max(180).optional(),
  adGroupId: z.string().max(180).optional(),
  creativeId: z.string().max(180).optional(),
  gclid: z.string().max(512).optional(),
  gbraid: z.string().max(512).optional(),
  wbraid: z.string().max(512).optional(),
  fbclid: z.string().max(512).optional(),
});
export const canonicalEventSchema = z.object({
  eventId: z.string().min(1).max(180),
  eventName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_.-]{0,119}$/),
  eventTime: z.coerce.date(),
  anonymousId: z.string().max(180).optional(),
  customerId: z.string().max(180).optional(),
  source: z.string().min(1).max(80),
  campaign: campaignReferenceSchema.default({}),
  properties: z.record(z.unknown()).default({}),
  context: z.record(z.unknown()).default({}),
  identifiers: z
    .object({
      email: z.string().email().optional(),
      phone: z.string().max(32).optional(),
      externalId: z.string().max(180).optional(),
    })
    .default({}),
  consent: consentSchema.default({ analytics: false, advertising: false }),
});
export type CanonicalEventInput = z.infer<typeof canonicalEventSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(256),
  workspaceId: z.string().optional(),
});
export const connectorSchema = z.object({
  name: z.string().min(2).max(120),
  provider: z.enum([
    'meta',
    'google_ads',
    'ga4',
    'hubspot',
    'salesforce',
    'zoho',
    'leadsquared',
    'shopify',
    'woocommerce',
    'twilio',
    'exotel',
    'csv',
    'google_sheets',
    'webhook',
    'database',
    'warehouse',
    'custom',
  ]),
  direction: z.enum(['source', 'destination', 'bidirectional']),
  authType: z.enum(['oauth2', 'api_key', 'service_account', 'none']).default('oauth2'),
  credentialReference: z.string().max(512).optional(),
  configuration: z.record(z.unknown()).default({}),
});
export type ConnectorInput = z.infer<typeof connectorSchema>;

export const attributionModels = [
  'first_touch',
  'last_touch',
  'last_non_direct',
  'linear',
  'time_decay',
  'position_based',
  'campaign_weighted',
  'custom_rule',
  'data_driven',
  'b2b_account',
  'revenue',
  'pipeline',
  'lead_stage',
  'call',
  'offline',
] as const;
export const attributionRunSchema = z
  .object({
    model: z.enum(attributionModels),
    conversionEvent: z.string().min(1),
    windowDays: z.number().int().min(1).max(365).default(90),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    configuration: z.record(z.unknown()).default({}),
  })
  .refine((v) => v.endAt >= v.startAt, { message: 'endAt must not precede startAt' });

export type AudienceRule =
  | {
      field: string;
      operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'in' | 'exists';
      value?: unknown;
    }
  | { combinator: 'and' | 'or'; rules: AudienceRule[] };
export const audienceRuleSchema: z.ZodType<AudienceRule> = z.lazy(() =>
  z.union([
    z.object({
      field: z.string().min(1).max(180),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'exists']),
      value: z.unknown().optional(),
    }),
    z.object({
      combinator: z.enum(['and', 'or']),
      rules: z.array(audienceRuleSchema).min(1).max(50),
    }),
  ]),
);
export const audienceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).default(''),
  rule: audienceRuleSchema,
  destinations: z.array(z.string()).max(20).default([]),
  requireAdvertisingConsent: z.boolean().default(true),
});

export const workflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    'trigger',
    'condition',
    'enrichment',
    'ai_decision',
    'approval',
    'action',
    'delay',
    'notification',
    'end',
  ]),
  name: z.string().min(1).max(120),
  configuration: z.record(z.unknown()).default({}),
});
export const workflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  condition: z.string().max(500).optional(),
});
export const workflowSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).default(''),
  status: z.enum(['draft', 'published', 'paused']).default('draft'),
  nodes: z.array(workflowNodeSchema).min(1).max(250),
  edges: z.array(workflowEdgeSchema).max(500),
  dryRunDefault: z.boolean().default(true),
});

export const autonomySchema = z.enum(['advisory', 'approval', 'policy_bound']);
export const agentPolicySchema = z.object({
  maxDailyBudgetChangePercent: z.number().min(0).max(100).default(0),
  allowedChannels: z.array(z.string()).default([]),
  minimumConfidence: z.number().min(0).max(1).default(0.9),
  minimumSampleSize: z.number().int().min(0).default(1000),
  approvalImpactThreshold: z.number().min(0).default(50000),
  excludedCampaigns: z.array(z.string()).default([]),
});
export const agentSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum([
    'marketing_analyst',
    'data_quality',
    'attribution',
    'lead_intelligence',
    'audience',
    'signal_return',
    'campaign_monitoring',
    'budget_recommendation',
    'creative_intelligence',
    'funnel_leakage',
    'fraud_detection',
    'report',
    'connector_repair',
    'voice_qualification',
    'retention',
  ]),
  autonomy: autonomySchema.default('advisory'),
  policy: agentPolicySchema.default({}),
  enabled: z.boolean().default(true),
  instructions: z.string().max(5000).default(''),
});
export const agentExecuteSchema = z.object({
  prompt: z.string().min(2).max(10000),
  context: z.record(z.unknown()).default({}),
  requestedAction: z.record(z.unknown()).optional(),
  dryRun: z.boolean().default(true),
});

export const activationSchema = z.object({
  destinationConnectorId: z.string().min(1),
  type: z.enum(['conversion', 'audience_sync', 'crm_writeback', 'analytics_event', 'webhook']),
  payload: z.record(z.unknown()),
  dryRun: z.boolean().default(true),
  idempotencyKey: z.string().min(8).max(180),
  approvalId: z.string().optional(),
});
export const approvalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().min(3).max(2000),
});
export const reportSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['executive', 'campaign', 'attribution', 'data_quality', 'agency', 'custom']),
  dateRange: z.object({ startAt: z.coerce.date(), endAt: z.coerce.date() }),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  schedule: z.string().max(120).optional(),
  recipients: z.array(z.string().email()).max(50).default([]),
});
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
  status: z.string().optional(),
  q: z.string().max(200).optional(),
});

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta: { requestId: string; generatedAt: string; nextCursor?: string };
}
export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string; generatedAt: string };
}
