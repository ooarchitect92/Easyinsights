import { loginSchema } from '@easyinsights/contracts';
import { appendAudit, config, opaqueToken, sha256, verifyPassword } from '@easyinsights/core';
import { ApiError, handlePublicApi, parseBody } from '@/server/api';
export async function POST(request: Request) {
  let rawToken = '';
  const response = await handlePublicApi(
    request,
    async ({ requestId, db }) => {
      const input = await parseBody(request, loginSchema);
      const email = input.email.trim().toLowerCase();
      const user = await db.collection('users').findOne({ email, status: 'active' });
      if (
        !user ||
        typeof user.passwordHash !== 'string' ||
        !(await verifyPassword(input.password, user.passwordHash))
      )
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      const membership = await db.collection('memberships').findOne(
        {
          userId: user.id,
          status: 'active',
          ...(input.workspaceId ? { workspaceId: input.workspaceId } : {}),
        },
        { sort: { createdAt: 1 } },
      );
      if (!membership)
        throw new ApiError(403, 'NO_WORKSPACE', 'No active workspace membership was found.');
      rawToken = opaqueToken(48);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.sessionTtlSeconds * 1000);
      await db.collection('sessions').insertOne({
        id: `ses_${opaqueToken(12)}`,
        tokenHash: sha256(rawToken),
        userId: user.id,
        organizationId: membership.organizationId,
        workspaceId: membership.workspaceId,
        roles: membership.roles,
        createdAt: now,
        lastSeenAt: now,
        expiresAt,
      });
      await appendAudit(db, {
        scope: {
          organizationId: String(membership.organizationId),
          workspaceId: String(membership.workspaceId),
        },
        actorId: String(user.id),
        action: 'auth.login',
        resourceType: 'session',
        resourceId: 'self',
        requestId,
        metadata: { method: 'password' },
      });
      return {
        user: { id: user.id, name: user.name, email: user.email },
        workspaceId: membership.workspaceId,
        expiresAt,
      };
    },
    { rateBucket: 'login', limit: 10 },
  );
  if (response.ok && rawToken) {
    response.cookies.set(config.sessionCookieName, rawToken, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: config.sessionTtlSeconds,
    });
  }
  return response;
}
