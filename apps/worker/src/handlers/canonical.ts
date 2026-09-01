import type { ClientSession, Db, Document, Filter, UpdateFilter } from 'mongodb';
import { opaqueToken, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { requiredString } from './shared.js';

type JourneyTouchpoint = {
  eventId: string;
  eventName: string;
  source: string;
  medium?: string;
  campaignId?: string;
  eventTime: Date | string;
};

type JourneyRecord = {
  id: string;
  organizationId: string;
  workspaceId: string;
  profileId: string;
  firstSource: string;
  firstTouchAt: Date | string;
  lastSource: string;
  lastTouchAt: Date | string;
  converted: boolean;
  conversionEvent: string | null;
  touchpointCount: number;
  touchpoints: JourneyTouchpoint[];
  createdAt: Date;
  updatedAt: Date;
};

function identifierClauses(event: Document): Document[] {
  const ids = event.identifiers as Document | undefined;
  const clauses: Document[] = [];
  if (ids?.emailHash) clauses.push({ primaryEmailHash: ids.emailHash });
  if (ids?.phoneHash) clauses.push({ primaryPhoneHash: ids.phoneHash });
  if (ids?.externalId) clauses.push({ externalIds: ids.externalId });
  if (event.customerId) clauses.push({ externalIds: event.customerId });
  if (event.anonymousId) clauses.push({ anonymousIds: event.anonymousId });
  return clauses;
}

export async function handleCanonical(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const eventId = requiredString(message.payload.eventId, 'eventId');
  const scope = tenantFilter(message.scope);
  const event = await db
    .collection('canonical_events')
    .findOne({ ...scope, id: eventId }, { session });
  if (!event) throw new Error(`Canonical event ${eventId} was not found`);
  const clauses = identifierClauses(event);
  let profile: Document | null = clauses.length
    ? await db.collection('customer_profiles').findOne({ ...scope, $or: clauses }, { session })
    : null;
  const now = new Date();
  let decision = 'created';
  if (!profile) {
    const profileId = `cus_${opaqueToken(12)}`;
    const ids = event.identifiers as Document | undefined;
    const profileDoc = {
      id: profileId,
      ...message.scope,
      displayName: String(
        event.properties?.name ?? event.properties?.fullName ?? 'Anonymous customer',
      ),
      primaryEmailHash: ids?.emailHash,
      primaryPhoneHash: ids?.phoneHash,
      externalIds: [...new Set([ids?.externalId, event.customerId].filter(Boolean))],
      anonymousIds: event.anonymousId ? [event.anonymousId] : [],
      consent: event.consent,
      firstTouchSource: event.campaign?.source ?? event.source,
      latestTouchSource: event.campaign?.source ?? event.source,
      firstSeenAt: event.eventTime,
      lastSeenAt: event.eventTime,
      stage: event.eventName.includes('qualified') ? 'qualified' : 'new',
      leadScore: event.eventName.includes('qualified') ? 80 : 25,
      leadGrade: event.eventName.includes('qualified') ? 'A' : 'C',
      lifetimeValue: Number(event.properties?.value ?? event.properties?.estimatedValue ?? 0),
      traits: {},
      identityEvidence: clauses.map((clause) => Object.keys(clause)[0]),
      createdAt: now,
      updatedAt: now,
      dataClassification: 'restricted',
    };
    await db.collection('customer_profiles').insertOne(profileDoc, { session });
    profile = profileDoc;
    decision = 'created';
  } else {
    decision = 'merged';
    const ids = event.identifiers as Document | undefined;
    const update: Document = {
      $set: {
        latestTouchSource: event.campaign?.source ?? event.source,
        lastSeenAt: event.eventTime,
        consent: event.consent,
        updatedAt: now,
      },
      $addToSet: {
        externalIds: { $each: [ids?.externalId, event.customerId].filter(Boolean) },
        anonymousIds: { $each: [event.anonymousId].filter(Boolean) },
      },
    };
    if (event.eventName.includes('qualified'))
      Object.assign(update.$set as Document, {
        stage: 'qualified',
        leadScore: Math.max(Number(profile.leadScore ?? 0), 80),
        leadGrade: 'A',
      });
    if (event.eventName.includes('payment') || event.eventName.includes('purchase'))
      Object.assign(update.$set as Document, {
        stage: 'customer',
        lifetimeValue: Number(profile.lifetimeValue ?? 0) + Number(event.properties?.value ?? 0),
      });
    await db.collection('customer_profiles').updateOne({ id: profile.id }, update, { session });
  }
  const matchedOn = clauses.flatMap((clause) => Object.keys(clause));
  await db.collection('identity_decisions').insertOne(
    {
      id: `idn_${opaqueToken(12)}`,
      ...message.scope,
      eventId,
      profileId: profile.id,
      decision,
      matchedOn,
      confidence: matchedOn.length ? 1 : 0.5,
      createdAt: now,
    },
    { session },
  );

  const eventName = String(event.eventName);
  const source = String(event.campaign?.source ?? event.source ?? 'unknown');
  const profileId = String(profile.id);
  const touchpoint: JourneyTouchpoint = {
    eventId,
    eventName,
    source,
    eventTime: event.eventTime as Date | string,
    ...(event.campaign?.medium ? { medium: String(event.campaign.medium) } : {}),
    ...(event.campaign?.campaignId
      ? { campaignId: String(event.campaign.campaignId) }
      : {}),
  };
  const journeyFilter: Filter<JourneyRecord> = {
    organizationId: message.scope.organizationId,
    workspaceId: message.scope.workspaceId,
    profileId,
  };
  const journeyUpdate: UpdateFilter<JourneyRecord> = {
    $setOnInsert: {
      id: `jny_${opaqueToken(12)}`,
      ...message.scope,
      profileId,
      firstSource: source,
      firstTouchAt: event.eventTime as Date | string,
      createdAt: now,
    },
    $set: {
      lastSource: source,
      lastTouchAt: event.eventTime as Date | string,
      converted: Boolean(eventName.includes('payment') || eventName.includes('purchase')),
      conversionEvent:
        eventName.includes('payment') || eventName.includes('purchase') ? eventName : null,
      updatedAt: now,
    },
    $inc: { touchpointCount: 1 },
    $push: {
      touchpoints: {
        $each: [touchpoint],
        $slice: -500,
      },
    },
  };
  await db
    .collection<JourneyRecord>('journeys')
    .updateOne(journeyFilter, journeyUpdate, { upsert: true, session });

  const findings = [] as Document[];
  if (!event.customerId && !event.anonymousId)
    findings.push({
      title: 'Event has no customer or anonymous identifier',
      category: 'identity',
      severity: 'warning',
      impactScore: 65,
    });
  if (
    !event.campaign?.campaignId &&
    ['ad_click', 'lead_created', 'qualified_lead'].includes(String(event.eventName))
  )
    findings.push({
      title: 'Campaign ID is missing on a marketing event',
      category: 'campaign_mapping',
      severity: 'warning',
      impactScore: 55,
    });
  if (event.consent?.advertising !== true && String(event.eventName).includes('qualified'))
    findings.push({
      title: 'Qualified lead is not eligible for advertising activation',
      category: 'consent',
      severity: 'info',
      impactScore: 35,
    });
  for (const finding of findings)
    await db.collection('quality_findings').insertOne(
      {
        id: `qf_${opaqueToken(12)}`,
        ...message.scope,
        eventId,
        status: 'open',
        createdAt: now,
        ...finding,
      },
      { session },
    );
  await db
    .collection('canonical_events')
    .updateOne(
      { id: eventId },
      { $set: { profileId: profile.id, processingStatus: 'processed', processedAt: now } },
      { session },
    );
}
