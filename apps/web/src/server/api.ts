import { randomUUID } from 'node:crypto';
import type { ClientSession, Db, Document, Filter } from 'mongodb';
import { NextResponse } from 'next/server';
import type {
  ApiFailure,
  ApiSuccess,
  Permission,
  Principal,
  TenantScope,
} from '@easyinsights/contracts';
import {
  config,
  getDb,
  getMongoClient,
  getRedis,
  hasPermission,
  resolvePrincipal,
  sha256,
  tenantFilter,
} from '@easyinsights/core';
import type { ZodType } from 'zod';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
export function requestId(request: Request): string {
  return request.headers.get('x-request-id')?.slice(0, 128) || randomUUID();
}
function failure(id: string, error: unknown): NextResponse<ApiFailure> {
  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
  if (!(error instanceof ApiError))
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: id,
        error: error instanceof Error ? error.stack : String(error),
      }),
    );
  const payload: ApiFailure = {
    ok: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details === undefined ? {} : { details: apiError.details }),
    },
    meta: { requestId: id, generatedAt: new Date().toISOString() },
  };
  return NextResponse.json(payload, {
    status: apiError.status,
    headers: { 'x-request-id': id, 'cache-control': 'no-store' },
  });
}
export function success<T>(
  id: string,
  data: T,
  status = 200,
  nextCursor?: string,
): NextResponse<ApiSuccess<T>> {
  const meta = {
    requestId: id,
    generatedAt: new Date().toISOString(),
    ...(nextCursor ? { nextCursor } : {}),
  };
  return NextResponse.json(
    { ok: true, data, meta },
    { status, headers: { 'x-request-id': id, 'cache-control': 'no-store' } },
  );
}
export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'A valid JSON request body is required.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      422,
      'VALIDATION_ERROR',
      'Request validation failed.',
      parsed.error.flatten(),
    );
  return parsed.data;
}
function originAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    const supplied = new URL(origin);
    const expected = new URL(config.appBaseUrl);
    return supplied.host === expected.host;
  } catch {
    return false;
  }
}
export async function rateLimit(
  request: Request,
  bucket: string,
  limit = 120,
  windowSeconds = 60,
): Promise<void> {
  const address = (request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown').trim();
  const key = `ratelimit:${bucket}:${sha256(address)}`;
  try {
    const redis = getRedis();
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, windowSeconds);
    if (count > limit) throw new ApiError(429, 'RATE_LIMITED', 'Too many requests. Retry later.');
  } catch (error) {
    if (error instanceof ApiError) throw error;
  }
}
export async function apiPrincipal(request: Request, permission?: Permission): Promise<Principal> {
  const rawCookie = request.headers.get('cookie') ?? '';
  const encoded = rawCookie
    .split(';')
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${config.sessionCookieName}=`))
    ?.split('=')
    .slice(1)
    .join('=');
  const principal = await resolvePrincipal(encoded ? decodeURIComponent(encoded) : undefined);
  if (!principal) throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in is required.');
  if (permission && !hasPermission(principal, permission))
    throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
  return principal;
}
export async function handleApi<T>(
  request: Request,
  handler: (context: { requestId: string; principal: Principal; db: Db }) => Promise<T>,
  options: { permission?: Permission; csrf?: boolean; rateBucket?: string } = {},
): Promise<NextResponse<ApiSuccess<T> | ApiFailure>> {
  const id = requestId(request);
  try {
    await rateLimit(request, options.rateBucket ?? 'api');
    if (
      options.csrf !== false &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !originAllowed(request)
    )
      throw new ApiError(403, 'ORIGIN_REJECTED', 'Request origin was rejected.');
    const principal = await apiPrincipal(request, options.permission);
    const db = await getDb();
    const result = await handler({ requestId: id, principal, db });
    return success(id, result);
  } catch (error) {
    return failure(id, error);
  }
}
export async function handlePublicApi<T>(
  request: Request,
  handler: (context: { requestId: string; db: Db }) => Promise<T>,
  options: { csrf?: boolean; rateBucket?: string; limit?: number } = {},
): Promise<NextResponse<ApiSuccess<T> | ApiFailure>> {
  const id = requestId(request);
  try {
    await rateLimit(request, options.rateBucket ?? 'public', options.limit ?? 60);
    if (
      options.csrf !== false &&
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      !originAllowed(request)
    )
      throw new ApiError(403, 'ORIGIN_REJECTED', 'Request origin was rejected.');
    const result = await handler({ requestId: id, db: await getDb() });
    return success(id, result);
  } catch (error) {
    return failure(id, error);
  }
}
export function scopeFilter(scope: TenantScope, extra: Filter<Document> = {}): Filter<Document> {
  return { ...tenantFilter(scope), ...extra };
}
export async function idempotency<T>(
  db: Db,
  scope: TenantScope,
  key: string,
  work: (session: ClientSession) => Promise<T>,
): Promise<{ value: T; replayed: boolean }> {
  const existing = await db.collection('idempotency_keys').findOne({ ...tenantFilter(scope), key });
  if (existing) return { value: existing.response as T, replayed: true };
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      const again = await db
        .collection('idempotency_keys')
        .findOne({ ...tenantFilter(scope), key }, { session });
      if (again) {
        result = again.response as T;
        return;
      }
      result = await work(session);
      await db.collection('idempotency_keys').insertOne(
        {
          id: `idem_${randomUUID()}`,
          ...scope,
          key,
          response: result,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        { session },
      );
    });
    return { value: result, replayed: false };
  } finally {
    await session.endSession();
  }
}
