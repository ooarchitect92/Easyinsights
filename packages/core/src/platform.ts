import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { MongoClient, type ClientSession, type Db, type Document, type Filter } from 'mongodb';
import type { Permission, Principal, Role, TenantScope } from '@easyinsights/contracts';
import { config } from './config.js';
const scrypt = promisify(scryptCallback);
let mongoClient: MongoClient | undefined;
let mongoConnect: Promise<MongoClient> | undefined;
export async function getMongoClient(): Promise<MongoClient> {
  if (mongoClient) return mongoClient;
  mongoConnect ??= new MongoClient(config.mongoUri, {
    appName: 'easyinsights',
    maxPoolSize: 50,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
  }).connect();
  mongoClient = await mongoConnect;
  return mongoClient;
}
export async function getDb(): Promise<Db> {
  return (await getMongoClient()).db(config.mongoDb);
}
export async function closeMongo(): Promise<void> {
  if (mongoClient) await mongoClient.close();
  mongoClient = undefined;
  mongoConnect = undefined;
}
export async function withTransaction<T>(
  work: (db: Db, session: ClientSession) => Promise<T>,
): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    return await session.withTransaction(async () => work(client.db(config.mongoDb), session), {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary',
    });
  } finally {
    await session.endSession();
  }
}
export function tenantFilter(scope: TenantScope): Filter<Document> {
  return { organizationId: scope.organizationId, workspaceId: scope.workspaceId };
}
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
export function opaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
export function normalizePhone(value: string): string {
  return value.replace(/[^0-9+]/g, '').replace(/^00/, '+');
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password + config.passwordPepper, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = (await scrypt(password + config.passwordPepper, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
const rolePermissions: Record<Role, Permission[]> = {
  platform_admin: [
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
  ],
  organization_admin: [
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
  ],
  workspace_admin: [
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
    'audit:read',
  ],
  marketer: [
    'workspace:read',
    'connector:read',
    'event:read',
    'customer:read',
    'campaign:read',
    'campaign:write',
    'measurement:read',
    'audience:read',
    'audience:write',
    'workflow:read',
    'workflow:write',
    'agent:read',
    'agent:execute',
    'approval:read',
    'activation:read',
    'activation:write',
    'report:read',
    'report:write',
  ],
  analyst: [
    'workspace:read',
    'connector:read',
    'event:read',
    'customer:read',
    'campaign:read',
    'measurement:read',
    'measurement:write',
    'audience:read',
    'agent:read',
    'agent:execute',
    'report:read',
    'report:write',
  ],
  sales: [
    'workspace:read',
    'event:read',
    'customer:read',
    'customer:write',
    'campaign:read',
    'audience:read',
    'report:read',
  ],
  finance: [
    'workspace:read',
    'campaign:read',
    'measurement:read',
    'report:read',
    'billing:read',
    'billing:write',
  ],
  viewer: [
    'workspace:read',
    'connector:read',
    'event:read',
    'customer:read',
    'campaign:read',
    'measurement:read',
    'audience:read',
    'workflow:read',
    'agent:read',
    'approval:read',
    'activation:read',
    'report:read',
    'billing:read',
  ],
};
export function permissionsForRoles(roles: Role[]): Permission[] {
  return [...new Set(roles.flatMap((role) => rolePermissions[role]))];
}
export function hasPermission(principal: Principal, permission: Permission): boolean {
  return (
    principal.permissions.includes(permission) || principal.permissions.includes('platform:admin')
  );
}
export interface StoredSession extends Document {
  id: string;
  tokenHash: string;
  userId: string;
  organizationId: string;
  workspaceId: string;
  roles: Role[];
  expiresAt: Date;
  revokedAt?: Date;
}
export async function resolvePrincipal(rawToken: string | undefined): Promise<Principal | null> {
  if (!rawToken) return null;
  const db = await getDb();
  const session = await db.collection<StoredSession>('sessions').findOne({
    tokenHash: sha256(rawToken),
    expiresAt: { $gt: new Date() },
    revokedAt: { $exists: false },
  });
  if (!session) return null;
  const user = await db.collection('users').findOne({ id: session.userId, status: 'active' });
  if (!user) return null;
  return {
    userId: session.userId,
    email: String(user.email),
    name: String(user.name),
    tenant: { organizationId: session.organizationId, workspaceId: session.workspaceId },
    roles: session.roles,
    permissions: permissionsForRoles(session.roles),
  };
}
export async function appendAudit(
  db: Db,
  input: {
    scope: TenantScope;
    actorId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    session?: ClientSession;
  },
): Promise<void> {
  const collection = db.collection('audit_logs');
  const previous = await collection
    .find(tenantFilter(input.scope), { session: input.session })
    .sort({ sequence: -1 })
    .limit(1)
    .next();
  const sequence = Number(previous?.sequence ?? 0) + 1;
  const previousHash = String(previous?.entryHash ?? 'GENESIS');
  const occurredAt = new Date();
  const body = JSON.stringify({
    scope: input.scope,
    actorId: input.actorId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    sequence,
    previousHash,
    occurredAt: occurredAt.toISOString(),
    metadata: input.metadata ?? {},
  });
  const entryHash = sha256(body);
  await collection.insertOne(
    {
      id: `aud_${opaqueToken(12)}`,
      ...input.scope,
      actorId: input.actorId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      requestId: input.requestId,
      metadata: input.metadata ?? {},
      sequence,
      previousHash,
      entryHash,
      occurredAt,
      createdAt: occurredAt,
      dataClassification: 'internal',
    },
    { session: input.session },
  );
}
export function publicDocument<T extends Document>(doc: T): Omit<T, '_id'> {
  const { _id: _, ...rest } = doc;
  return rest as Omit<T, '_id'>;
}
