import { Kafka } from 'kafkajs';
import { NextResponse } from 'next/server';
import { config, getDb, getRedis } from '@easyinsights/core';
export const dynamic = 'force-dynamic';
export async function GET() {
  const checks: Record<string, string> = {};
  let ready = true;
  try {
    await (await getDb()).command({ ping: 1 });
    checks.mongodb = 'ok';
  } catch {
    checks.mongodb = 'failed';
    ready = false;
  }
  try {
    await getRedis().ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'failed';
    ready = false;
  }
  const admin = new Kafka({
    clientId: `${config.kafkaClientId}-readiness`,
    brokers: config.kafkaBrokers,
    connectionTimeout: 2500,
    requestTimeout: 3000,
  }).admin();
  try {
    await admin.connect();
    await admin.fetchTopicMetadata();
    checks.kafka = 'ok';
  } catch {
    checks.kafka = 'failed';
    ready = false;
  } finally {
    await admin.disconnect().catch(() => undefined);
  }
  return NextResponse.json(
    { status: ready ? 'ready' : 'not_ready', checks, time: new Date().toISOString() },
    { status: ready ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
