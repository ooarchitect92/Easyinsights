function integer(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0)
    throw new Error(`${name} must be a positive integer`);
  return parsed;
}
function boolean(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}
export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/easyinsights?replicaSet=rs0',
  mongoDb: process.env.MONGODB_DB ?? 'easyinsights',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  kafkaBrokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean),
  kafkaClientId: process.env.KAFKA_CLIENT_ID ?? 'easyinsights',
  kafkaGroupId: process.env.KAFKA_GROUP_ID ?? 'easyinsights-consumer',
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'ei_session',
  sessionTtlSeconds: integer('SESSION_TTL_SECONDS', 8 * 60 * 60),
  rawEventTtlDays: integer('RAW_EVENT_TTL_DAYS', 90),
  idempotencyTtlHours: integer('IDEMPOTENCY_TTL_HOURS', 24),
  outboxTtlDays: integer('OUTBOX_TTL_DAYS', 14),
  runTtlDays: integer('RUN_TTL_DAYS', 90),
  passwordPepper: process.env.PASSWORD_PEPPER ?? 'development-only-change-me-32-characters',
  webhookSigningSecret:
    process.env.WEBHOOK_SIGNING_SECRET ?? 'development-only-change-me-32-characters',
  liveActivationEnabled: boolean('LIVE_ACTIVATION_ENABLED', false),
  allowedActivationHosts: new Set(
    (process.env.ALLOWED_ACTIVATION_HOSTS ?? '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  ),
  aiProvider: process.env.AI_PROVIDER ?? 'deterministic',
  aiApiBaseUrl: process.env.AI_API_BASE_URL,
  aiApiKey: process.env.AI_API_KEY,
  aiModel: process.env.AI_MODEL,
} as const;
export function retentionDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
