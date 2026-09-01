import { appendAudit, config, sha256 } from '@easyinsights/core';
import { handleApi } from '@/server/api';
export async function POST(request: Request) {
  const response = await handleApi(request, async ({ requestId, principal, db }) => {
    const raw = (request.headers.get('cookie') ?? '')
      .split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(`${config.sessionCookieName}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    if (raw)
      await db
        .collection('sessions')
        .updateOne(
          { tokenHash: sha256(decodeURIComponent(raw)) },
          { $set: { revokedAt: new Date() } },
        );
    await appendAudit(db, {
      scope: principal.tenant,
      actorId: principal.userId,
      action: 'auth.logout',
      resourceType: 'session',
      resourceId: 'self',
      requestId,
    });
    return { signedOut: true };
  });
  response.cookies.set(config.sessionCookieName, '', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
