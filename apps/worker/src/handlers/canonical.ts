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
  conversionAt?: Date | string | null;
  touchpointCount: number;
  touchpoints: JourneyTouchpoint[];
  createdAt: Date;
  updatedAt: Date;
};

const qualificationEvents = new Set(['qualified_lead', 'lead_qualified']);
const paymentEvents = new Set(['payment', 'payment_completed', 'purchase', 'order_completed']);
const estimatedValueEvents = new Set(['opportunity_created', 'deal_created', 'deal_value_updated']);

export function classifyCanonicalEvent(eventName: string): {
  qualified: boolean;
  conversion: boolean;
  estimatedValue: boolean;
} {
  const normalized = eventName.trim().toLowerCase();
  return {
    qualified: qualificationEvents.has(normalized),
    conversion: paymentEvents.has(normalized),
    estimatedValue: estimatedValueEvents.has(normalized),
  };
}

function asDate(value: unknown): Date {
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error('Canonical event has an invalid eventTime');
  return parsed;
}

function isEarlier(left: Date, right: unknown): boolean {
  if (!right) return true;
  return left.getTime() < asDate(right).getTime();
}

function isLater(left: Date, right: unknown): boolean {
  if (!right) return true;
  return left.getTime() > asDate(right).getTime();
}

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

  const eventName = String(event.eventName);
  const eventClass = classifyCanonicalEvent(eventName);
  const eventTime = asDate(event.eventTime);
  const source = String(event.campaign?.source ?? event.source ?? 'unknown');
  const observedValue = eventClass.conversion ? Number(event.properties?.value ?? 0) : 0;
  const estimatedValue = eventClass.estimatedValue
    ? Number(event.properties?.estimatedValue ?? event.properties?.value ?? 0)
    : Number(event.properties?.estimatedValue ?? 0);

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
      consentObservedAt: event.consent?.capturedAt ? asDate(event.consent.capturedAt) : eventTime,
      firstTouchSource: source,
      latestTouchSource: source,
      firstSeenAt: eventTime,
      lastSeenAt: eventTime,
      stage: eventClass.conversion ? 'customer' : eventClass.qualified ? 'qualified' : 'new',
      heuristicScore: eventClass.qualified ? 80 : 25,
      leadScore: eventClass.qualified ? 80 : 25,
      leadGrade: eventClass.qualified ? 'A' : 'C',
      lifetimeValue: observedValue,
      observedRevenue: observedValue,
      estimatedDealValue: estimatedValue,
      firstConversionAt: eventClass.conversion ? eventTime : null,
      latestConversionAt: eventClass.conversion ? eventTime : null,
      traits: {},
      identityEvidence: clauses.map((clause) => Object.keys(clause)[0]),
      createdAt: now,
      updatedAt: now,
      dataClassification: 'restricted',
    };
    await db.collection('customer_profiles').insertOne(profileDoc, { session });
    profile = profileDoc;
  } else {
    decision = 'merged';
    const ids = event.identifiers as Document | undefined;
    const set: Document = { updatedAt: now };

    if (isEarlier(eventTime, profile.firstSeenAt)) {
      set.firstSeenAt = eventTime;
      set.firstTouchSource = source;
    }
    if (isLater(eventTime, profile.lastSeenAt)) {
      set.lastSeenAt = eventTime;
      set.latestTouchSource = source;
    }

    const incomingConsentAt = event.consent?.capturedAt ? asDate(event.consent.capturedAt) : eventTime;
    if (isLater(incomingConsentAt, profile.consentObservedAt)) {
      set.consent = event.consent;
      set.consentObservedAt = incomingConsentAt;
    }

    if (eventClass.qualified && profile.stage !== 'customer') {
      set.stage = 'qualified';
      set.heuristicScore = Math.max(Number(profile.heuristicScore ?? profile.leadScore ?? 0), 80);
      set.leadScore = Math.max(Number(profile.leadScore ?? 0), 80);
      set.leadGrade = 'A';
    }

    if (eventClass.conversion) {
      set.stage = 'customer';
      set.observedRevenue = Number(profile.observedRevenue ?? profile.lifetimeValue ?? 0) + observedValue;
      set.lifetimeValue = Number(profile.lifetimeValue ?? 0) + observedValue;
      if (!profile.firstConversionAt || isEarlier(eventTime, profile.firstConversionAt))
        set.firstConversionAt = eventTime;
      if (!profile.latestConversionAt || isLater(eventTime, profile.latestConversionAt))
        set.latestConversionAt = eventTime;
    }

    if (estimatedValue > 0)
      set.estimatedDealValue = Math.max(Number(profile.estimatedDealValue ?? 0), estimatedValue);

    const update: Document = {
      $set: set,
      $addToSet: {
        externalIds: { $each: [ids?.externalId, event.customerId].filter(Boolean) },
        anonymousIds: { $each: [event.anonymousId].filter(Boolean) },
      },
    };
    await db
      .collection('customer_profiles')
      .updateOne({ ...scope, id: profile.id }, update, { session });
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

  const profileId = String(profile.id);
  const touchpoint: JourneyTouchpoint = {
    eventId,
    eventName,
    source,
    eventTime,
    ...(event.campaign?.medium ? { medium: String(event.campaign.medium) } : {}),
    ...(event.campaign?.campaignId ? { campaignId: String(event.campaign.campaignId) } : {}),
  };
  const journeyFilter: Filter<JourneyRecord> = {
    organizationId: message.scope.organizationId,
    workspaceId: message.scope.workspaceId,
    profileId,
  };
  const existingJourney = await db
    .collection<JourneyRecord>('journeys')
    .findOne(journeyFilter, { session });

  const journeySet: Partial<JourneyRecord> = { updatedAt: now };
  if (!existingJourney || isEarlier(eventTime, existingJourney.firstTouchAt)) {
    journeySet.firstTouchAt = eventTime;
    journeySet.firstSource = source;
  }
  if (!existingJourney || isLater(eventTime, existingJourney.lastTouchAt)) {
    journeySet.lastTouchAt = eventTime;
    journeySet.lastSource = source;
  }
  if (eventClass.conversion) {
    journeySet.converted = true;
    if (!existingJourney?.conversionAt || isEarlier(eventTime, existingJourney.conversionAt)) {
      journeySet.conversionAt = eventTime;
      journeySet.conversionEvent = eventName;
    }
  } else if (!existingJourney) {
    journeySet.converted = false;
    journeySet.conversionEvent = null;
    journeySet.conversionAt = null;
  }

  const journeyUpdate: UpdateFilter<JourneyRecord> = {
    $setOnInsert: {
      id: `jny_${opaqueToken(12)}`,
      ...message.scope,
      profileId,
      createdAt: now,
    },
    $set: journeySet,
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
    ['ad_click', 'lead_created', 'qualified_lead'].includes(eventName)
  )
    findings.push({
      title: 'Campaign ID is missing on a marketing event',
      category: 'campaign_mapping',
      severity: 'warning',
      impactScore: 55,
    });
  if (event.consent?.advertising !== true && eventClass.qualified)
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
      { ...scope, id: eventId },
      { $set: { profileId: profile.id, processingStatus: 'processed', processedAt: now } },
      { session },
    );
}
