import { appendAudit, closeMongo, getDb, hashPassword } from '@easyinsights/core';
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true')
  throw new Error('Production seeding is disabled unless ALLOW_PRODUCTION_SEED=true.');
const db = await getDb();
const now = new Date();
const day = 86400000;
const organizationId = 'org_demo_growth';
const workspaceId = 'wrk_demo_growth';
const adminId = 'usr_demo_admin';
const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@easyinsights.local').toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe-Strong-2026!';
if (password.length < 12)
  throw new Error('SEED_ADMIN_PASSWORD must contain at least 12 characters.');
await db
  .collection('organizations')
  .updateOne(
    { id: organizationId },
    {
      $setOnInsert: {
        id: organizationId,
        slug: 'demo-growth-agency',
        name: 'Demo Growth Agency',
        status: 'active',
        plan: 'Growth',
        dataRegion: 'India',
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
await db
  .collection('workspaces')
  .updateOne(
    { id: workspaceId },
    {
      $setOnInsert: {
        id: workspaceId,
        organizationId,
        slug: 'demo-growth',
        name: 'Demo Growth Workspace',
        status: 'active',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
await db
  .collection('users')
  .updateOne(
    { id: adminId },
    {
      $setOnInsert: {
        id: adminId,
        email,
        name: 'Demo Platform Administrator',
        status: 'active',
        createdAt: now,
      },
      $set: { passwordHash: await hashPassword(password), updatedAt: now },
    },
    { upsert: true },
  );
await db
  .collection('memberships')
  .updateOne(
    { id: 'mem_demo_admin' },
    {
      $setOnInsert: {
        id: 'mem_demo_admin',
        organizationId,
        workspaceId,
        userId: adminId,
        email,
        userName: 'Demo Platform Administrator',
        workspaceName: 'Demo Growth Workspace',
        roles: ['platform_admin'],
        status: 'active',
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
const scope = { organizationId, workspaceId };
const connectors = [
  {
    id: 'con_meta',
    name: 'Meta Ads',
    provider: 'meta',
    direction: 'bidirectional',
    authType: 'oauth2',
    status: 'credential_required',
    healthScore: 0,
  },
  {
    id: 'con_google',
    name: 'Google Ads',
    provider: 'google_ads',
    direction: 'bidirectional',
    authType: 'oauth2',
    status: 'credential_required',
    healthScore: 0,
  },
  {
    id: 'con_ga4',
    name: 'Google Analytics 4',
    provider: 'ga4',
    direction: 'bidirectional',
    authType: 'api_key',
    status: 'credential_required',
    healthScore: 0,
  },
  {
    id: 'con_hubspot',
    name: 'HubSpot CRM',
    provider: 'hubspot',
    direction: 'bidirectional',
    authType: 'oauth2',
    status: 'credential_required',
    healthScore: 0,
  },
  {
    id: 'con_webhook',
    name: 'Signed Website Webhook',
    provider: 'webhook',
    direction: 'source',
    authType: 'none',
    status: 'healthy',
    healthScore: 100,
  },
  {
    id: 'con_csv',
    name: 'Secure CSV Import',
    provider: 'csv',
    direction: 'source',
    authType: 'none',
    status: 'healthy',
    healthScore: 96,
  },
];
for (const row of connectors)
  await db
    .collection('connectors')
    .updateOne(
      { id: row.id },
      {
        $setOnInsert: {
          ...row,
          ...scope,
          configuration: { mode: row.provider === 'webhook' ? 'signed_webhook' : 'manual_upload' },
          createdBy: adminId,
          createdAt: now,
          dataClassification: 'confidential',
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
const campaigns = [
  {
    id: 'cmp_search_brand',
    externalId: 'gads-1001',
    name: 'Brand Search — India',
    channel: 'Google Ads',
    objective: 'Qualified leads',
    status: 'active',
    spend: 340000,
    revenue: 1820000,
    conversions: 184,
    impressions: 540000,
    clicks: 32600,
  },
  {
    id: 'cmp_meta_prospect',
    externalId: 'meta-2001',
    name: 'Enterprise Prospecting',
    channel: 'Meta Ads',
    objective: 'Lead generation',
    status: 'active',
    spend: 515000,
    revenue: 1645000,
    conversions: 132,
    impressions: 1820000,
    clicks: 47100,
  },
  {
    id: 'cmp_linkedin_abm',
    externalId: 'li-3001',
    name: 'South India ABM',
    channel: 'LinkedIn Ads',
    objective: 'SQL pipeline',
    status: 'active',
    spend: 285000,
    revenue: 1260000,
    conversions: 48,
    impressions: 265000,
    clicks: 8400,
  },
  {
    id: 'cmp_meta_retarget',
    externalId: 'meta-2002',
    name: 'High Intent Retargeting',
    channel: 'Meta Ads',
    objective: 'Qualified leads',
    status: 'active',
    spend: 175000,
    revenue: 940000,
    conversions: 96,
    impressions: 380000,
    clicks: 19600,
  },
];
for (const row of campaigns)
  await db
    .collection('campaigns')
    .updateOne(
      { id: row.id },
      {
        $setOnInsert: { ...row, ...scope, createdAt: new Date(now.getTime() - 60 * day) },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
const profiles = [
  {
    id: 'cus_aarav',
    displayName: 'Aarav Mehta',
    primaryEmailHash: 'seed-email-1',
    externalIds: ['crm-1001'],
    anonymousIds: ['anon-1001'],
    consent: { analytics: true, advertising: true },
    firstTouchSource: 'google',
    latestTouchSource: 'hubspot',
    firstSeenAt: new Date(now.getTime() - 28 * day),
    lastSeenAt: new Date(now.getTime() - 1 * day),
    stage: 'qualified',
    leadScore: 88,
    leadGrade: 'A',
    lifetimeValue: 185000,
    traits: { region: 'South', productInterest: 'Enterprise' },
  },
  {
    id: 'cus_mira',
    displayName: 'Mira Rao',
    primaryEmailHash: 'seed-email-2',
    externalIds: ['crm-1002'],
    anonymousIds: ['anon-1002'],
    consent: { analytics: true, advertising: true },
    firstTouchSource: 'meta',
    latestTouchSource: 'meta',
    firstSeenAt: new Date(now.getTime() - 19 * day),
    lastSeenAt: new Date(now.getTime() - 2 * day),
    stage: 'customer',
    leadScore: 94,
    leadGrade: 'A',
    lifetimeValue: 265000,
    traits: { region: 'West', productInterest: 'Growth' },
  },
  {
    id: 'cus_dev',
    displayName: 'Dev Nair',
    primaryPhoneHash: 'seed-phone-3',
    externalIds: ['crm-1003'],
    anonymousIds: ['anon-1003'],
    consent: { analytics: true, advertising: false },
    firstTouchSource: 'linkedin',
    latestTouchSource: 'sales_call',
    firstSeenAt: new Date(now.getTime() - 12 * day),
    lastSeenAt: new Date(now.getTime() - 3 * day),
    stage: 'contacted',
    leadScore: 61,
    leadGrade: 'B',
    lifetimeValue: 0,
    traits: { region: 'South', productInterest: 'Scale' },
  },
  {
    id: 'cus_anonymous',
    displayName: 'Anonymous customer',
    externalIds: [],
    anonymousIds: ['anon-1004'],
    consent: { analytics: true, advertising: false },
    firstTouchSource: 'direct',
    latestTouchSource: 'website',
    firstSeenAt: new Date(now.getTime() - 5 * day),
    lastSeenAt: new Date(now.getTime() - 4 * day),
    stage: 'new',
    leadScore: 24,
    leadGrade: 'C',
    lifetimeValue: 0,
    traits: { region: 'Unknown' },
  },
];
for (const row of profiles)
  await db
    .collection('customer_profiles')
    .updateOne(
      { id: row.id },
      {
        $setOnInsert: {
          ...row,
          ...scope,
          identityEvidence: ['seeded_demo'],
          createdAt: row.firstSeenAt,
          dataClassification: 'restricted',
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
const events = [
  {
    id: 'evt_seed_1',
    eventId: 'seed-1',
    eventName: 'ad_click',
    eventTime: new Date(now.getTime() - 28 * day),
    anonymousId: 'anon-1001',
    customerId: 'crm-1001',
    profileId: 'cus_aarav',
    source: 'website',
    campaign: { source: 'google', medium: 'cpc', campaignId: 'cmp_search_brand' },
    properties: { page: '/enterprise' },
    context: {},
    identifiers: { externalId: 'crm-1001' },
    consent: { analytics: true, advertising: true },
  },
  {
    id: 'evt_seed_2',
    eventId: 'seed-2',
    eventName: 'qualified_lead',
    eventTime: new Date(now.getTime() - 10 * day),
    anonymousId: 'anon-1001',
    customerId: 'crm-1001',
    profileId: 'cus_aarav',
    source: 'hubspot',
    campaign: { source: 'google', medium: 'cpc', campaignId: 'cmp_search_brand' },
    properties: { estimatedValue: 185000 },
    context: {},
    identifiers: { externalId: 'crm-1001' },
    consent: { analytics: true, advertising: true },
  },
  {
    id: 'evt_seed_3',
    eventId: 'seed-3',
    eventName: 'ad_click',
    eventTime: new Date(now.getTime() - 19 * day),
    anonymousId: 'anon-1002',
    customerId: 'crm-1002',
    profileId: 'cus_mira',
    source: 'website',
    campaign: { source: 'meta', medium: 'paid_social', campaignId: 'cmp_meta_prospect' },
    properties: { page: '/growth' },
    context: {},
    identifiers: { externalId: 'crm-1002' },
    consent: { analytics: true, advertising: true },
  },
  {
    id: 'evt_seed_4',
    eventId: 'seed-4',
    eventName: 'payment_completed',
    eventTime: new Date(now.getTime() - 2 * day),
    anonymousId: 'anon-1002',
    customerId: 'crm-1002',
    profileId: 'cus_mira',
    source: 'crm',
    campaign: { source: 'meta', medium: 'paid_social', campaignId: 'cmp_meta_prospect' },
    properties: { value: 265000, currency: 'INR' },
    context: {},
    identifiers: { externalId: 'crm-1002' },
    consent: { analytics: true, advertising: true },
  },
  {
    id: 'evt_seed_5',
    eventId: 'seed-5',
    eventName: 'call_connected',
    eventTime: new Date(now.getTime() - 3 * day),
    anonymousId: 'anon-1003',
    customerId: 'crm-1003',
    profileId: 'cus_dev',
    source: 'exotel',
    campaign: { source: 'linkedin', medium: 'cpc', campaignId: 'cmp_linkedin_abm' },
    properties: { durationSeconds: 420 },
    context: {},
    identifiers: { externalId: 'crm-1003' },
    consent: { analytics: true, advertising: false },
  },
];
for (const row of events)
  await db
    .collection('canonical_events')
    .updateOne(
      { id: row.id },
      {
        $setOnInsert: {
          ...row,
          ...scope,
          transformationVersion: 'canonical-v1',
          processingStatus: 'processed',
          processedAt: row.eventTime,
          createdAt: row.eventTime,
          dataClassification: 'confidential',
        },
      },
      { upsert: true },
    );
const journeys = [
  {
    id: 'jny_aarav',
    profileId: 'cus_aarav',
    firstSource: 'google',
    lastSource: 'hubspot',
    firstTouchAt: events[0]!.eventTime,
    lastTouchAt: events[1]!.eventTime,
    touchpointCount: 2,
    converted: false,
    conversionEvent: null,
    touchpoints: events
      .slice(0, 2)
      .map((e) => ({
        eventId: e.id,
        eventName: e.eventName,
        source: e.campaign.source,
        campaignId: e.campaign.campaignId,
        eventTime: e.eventTime,
      })),
  },
  {
    id: 'jny_mira',
    profileId: 'cus_mira',
    firstSource: 'meta',
    lastSource: 'meta',
    firstTouchAt: events[2]!.eventTime,
    lastTouchAt: events[3]!.eventTime,
    touchpointCount: 2,
    converted: true,
    conversionEvent: 'payment_completed',
    touchpoints: events
      .slice(2, 4)
      .map((e) => ({
        eventId: e.id,
        eventName: e.eventName,
        source: e.campaign.source,
        campaignId: e.campaign.campaignId,
        eventTime: e.eventTime,
      })),
  },
];
for (const row of journeys)
  await db
    .collection('journeys')
    .updateOne(
      { id: row.id },
      { $setOnInsert: { ...row, ...scope, createdAt: row.firstTouchAt }, $set: { updatedAt: now } },
      { upsert: true },
    );
const supportRows: Record<string, Record<string, unknown>[]> = {
  quality_findings: [
    {
      id: 'qf_seed_1',
      title: 'HubSpot sync is delayed',
      category: 'connector_latency',
      severity: 'warning',
      impactScore: 72,
      status: 'open',
      createdAt: new Date(now.getTime() - 2 * 3600000),
    },
    {
      id: 'qf_seed_2',
      title: '12% of website leads lack a stable phone identifier',
      category: 'identity',
      severity: 'warning',
      impactScore: 58,
      status: 'open',
      createdAt: new Date(now.getTime() - 6 * 3600000),
    },
  ],
  schema_versions: [
    {
      id: 'sch_canonical_1',
      name: 'Canonical Marketing Event',
      version: '1.0.0',
      type: 'event',
      status: 'published',
      compatibility: 'backward',
      createdAt: new Date(now.getTime() - 30 * day),
    },
  ],
  creatives: [
    {
      id: 'crt_1',
      name: 'Enterprise proof carousel',
      format: 'carousel',
      campaignId: 'cmp_meta_prospect',
      campaignName: 'Enterprise Prospecting',
      performanceScore: 87,
      fatigueStatus: 'healthy',
      brandStatus: 'approved',
      updatedAt: now,
    },
    {
      id: 'crt_2',
      name: 'ROI calculator video',
      format: 'video',
      campaignId: 'cmp_meta_retarget',
      campaignName: 'High Intent Retargeting',
      performanceScore: 92,
      fatigueStatus: 'warning',
      brandStatus: 'approved',
      updatedAt: now,
    },
  ],
  spend_facts: campaigns.map((c, i) => ({
    id: `sp_${i + 1}`,
    date: new Date(now.getTime() - day),
    channel: c.channel,
    campaignId: c.id,
    campaignName: c.name,
    spend: c.spend,
    budget: Math.round(c.spend * 1.05),
    variancePercent: -4.8,
    currency: 'INR',
    createdAt: now,
  })),
  funnel_results: [
    {
      id: 'fn_1',
      funnelName: 'Lead to revenue',
      stageName: 'Landing page visit',
      entered: 10000,
      completed: 6240,
      conversionRate: 62.4,
      medianTimeSeconds: 95,
      status: 'healthy',
      computedAt: now,
    },
    {
      id: 'fn_2',
      funnelName: 'Lead to revenue',
      stageName: 'Qualified lead',
      entered: 6240,
      completed: 1284,
      conversionRate: 20.6,
      medianTimeSeconds: 86400,
      status: 'warning',
      computedAt: now,
    },
    {
      id: 'fn_3',
      funnelName: 'Lead to revenue',
      stageName: 'Payment completed',
      entered: 1284,
      completed: 312,
      conversionRate: 24.3,
      medianTimeSeconds: 432000,
      status: 'healthy',
      computedAt: now,
    },
  ],
  consent_ledger: profiles.map((profile, i) => ({
    id: `cns_${i + 1}`,
    profileId: profile.id,
    purpose: 'advertising',
    granted: profile.consent.advertising,
    source: 'seed_demo',
    evidenceReference: `seed-evidence-${i + 1}`,
    capturedAt: profile.firstSeenAt,
    createdAt: profile.firstSeenAt,
  })),
  alerts: [
    {
      id: 'alt_1',
      title: 'CRM synchronization is 42 minutes behind',
      category: 'connector',
      severity: 'warning',
      status: 'open',
      ownerName: 'Data Operations',
      createdAt: new Date(now.getTime() - 2 * 3600000),
    },
    {
      id: 'alt_2',
      title: 'Prospecting frequency is above target',
      category: 'campaign',
      severity: 'warning',
      status: 'investigating',
      ownerName: 'Performance Marketing',
      createdAt: new Date(now.getTime() - 5 * 3600000),
    },
  ],
  segments: [
    {
      id: 'seg_1',
      name: 'High-intent enterprise leads',
      definitionType: 'behavioral',
      memberCount: 428,
      status: 'active',
      refreshedAt: now,
      createdAt: new Date(now.getTime() - 20 * day),
    },
  ],
};
for (const [collection, rows] of Object.entries(supportRows))
  for (const row of rows)
    await db
      .collection(collection)
      .updateOne({ id: row.id }, { $setOnInsert: { ...row, ...scope } }, { upsert: true });
const audience = {
  id: 'audn_high_intent',
  ...scope,
  name: 'High-intent qualified leads',
  description: 'Qualified profiles with a score of at least 75 and advertising consent.',
  rule: {
    combinator: 'and',
    rules: [
      { field: 'leadScore', operator: 'gte', value: 75 },
      { field: 'stage', operator: 'eq', value: 'qualified' },
      { field: 'consent.advertising', operator: 'eq', value: true },
    ],
  },
  destinations: ['Meta Custom Audiences', 'Google Customer Match'],
  requireAdvertisingConsent: true,
  status: 'active',
  memberCount: 1,
  eligibleCount: 1,
  lastEvaluatedAt: now,
  createdBy: adminId,
  createdAt: new Date(now.getTime() - 10 * day),
  updatedAt: now,
};
await db
  .collection('audiences')
  .updateOne(
    { id: audience.id },
    { $setOnInsert: audience, $set: { updatedAt: now } },
    { upsert: true },
  );
const workflow = {
  id: 'wfl_qualified_lead',
  ...scope,
  name: 'Qualified lead response',
  description:
    'Score and route qualified leads with a human approval before any external activation.',
  status: 'published',
  version: 1,
  nodeCount: 5,
  dryRunDefault: true,
  nodes: [
    { id: 'n1', type: 'trigger', name: 'Qualified lead received', configuration: {} },
    {
      id: 'n2',
      type: 'condition',
      name: 'Advertising consent present',
      configuration: { field: 'consent.advertising' },
    },
    { id: 'n3', type: 'ai_decision', name: 'Recommend next best action', configuration: {} },
    {
      id: 'n4',
      type: 'approval',
      name: 'Approve audience activation',
      configuration: {
        riskLevel: 'high',
        predictedImpact: 'Customer identifier delivery to an ad destination',
      },
    },
    { id: 'n5', type: 'end', name: 'Complete', configuration: {} },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2' },
    { id: 'e2', source: 'n2', target: 'n3' },
    { id: 'e3', source: 'n3', target: 'n4' },
    { id: 'e4', source: 'n4', target: 'n5' },
  ],
  createdBy: adminId,
  createdAt: new Date(now.getTime() - 8 * day),
  updatedAt: now,
};
await db
  .collection('workflows')
  .updateOne(
    { id: workflow.id },
    { $setOnInsert: workflow, $set: { updatedAt: now } },
    { upsert: true },
  );
const agents: Array<[string, string, string, string]> = [
  ['agt_marketing', 'Marketing Analyst Agent', 'marketing_analyst', 'advisory'],
  ['agt_quality', 'Data Quality Agent', 'data_quality', 'advisory'],
  ['agt_attribution', 'Attribution Agent', 'attribution', 'approval'],
  ['agt_budget', 'Budget Recommendation Agent', 'budget_recommendation', 'approval'],
  ['agt_report', 'Report Agent', 'report', 'advisory'],
];
for (const [id, name, type, autonomy] of agents)
  await db
    .collection('agents')
    .updateOne(
      { id },
      {
        $setOnInsert: {
          id,
          ...scope,
          name,
          type,
          autonomy,
          policy: {
            maxDailyBudgetChangePercent: 10,
            allowedChannels: ['Meta Ads', 'Google Ads'],
            minimumConfidence: 0.9,
            minimumSampleSize: 1000,
            approvalImpactThreshold: 50000,
            excludedCampaigns: ['Brand Search — India'],
          },
          enabled: true,
          instructions:
            'Use tenant-scoped governed data, cite evidence, and never bypass approval.',
          version: 1,
          createdBy: adminId,
          createdAt: new Date(now.getTime() - 12 * day),
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
await db
  .collection('subscriptions')
  .updateOne(
    scope,
    {
      $setOnInsert: {
        id: 'sub_demo_growth',
        ...scope,
        planId: 'growth',
        planName: 'Growth',
        status: 'active',
        currency: 'INR',
        monthlyPrice: 29999,
        entitlements: {
          monthlyEvents: 1000000,
          connectors: 15,
          workspaces: 5,
          aiOperations: 10000,
        },
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
await db
  .collection('usage_monthly')
  .updateOne(
    { ...scope, periodStart },
    {
      $setOnInsert: {
        id: 'usage_demo_current',
        ...scope,
        periodStart,
        events: 48260,
        activeProfiles: 12840,
        connectors: 6,
        activations: 42,
        aiOperations: 318,
        storageBytes: 786432000,
        status: 'within_limit',
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true },
  );
if (!(await db.collection('audit_logs').findOne({ ...scope, action: 'seed.complete' })))
  await appendAudit(db, {
    scope,
    actorId: 'system:seed',
    action: 'seed.complete',
    resourceType: 'workspace',
    resourceId: workspaceId,
    metadata: { demoData: true },
  });
console.log(
  JSON.stringify({
    status: 'ok',
    organizationId,
    workspaceId,
    email,
    passwordNote: 'Use SEED_ADMIN_PASSWORD; the repository does not print it.',
  }),
);
await closeMongo();
