const base = process.env.APP_BASE_URL ?? 'http://localhost:3000';
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${base}${path}`, init);
  const body = (await response.json()) as Record<string, unknown>;
  return { response, body };
}
const live = await json('/api/health/live');
ensure(live.response.ok, 'Liveness check failed');
const ready = await json('/api/health/ready');
ensure(ready.response.ok, `Readiness check failed: ${JSON.stringify(ready.body)}`);
const login = await json('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: base },
  body: JSON.stringify({
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@easyinsights.local',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe-Strong-2026!',
  }),
});
ensure(login.response.ok, `Login failed: ${JSON.stringify(login.body)}`);
const cookie = login.response.headers.get('set-cookie');
ensure(cookie, 'Login did not return a session cookie');
const sessionCookie = cookie.split(';')[0];
ensure(sessionCookie, 'Session cookie could not be parsed');
const dashboard = await json('/api/v1/dashboard', { headers: { cookie: sessionCookie } });
ensure(dashboard.response.ok, 'Dashboard request failed');
const event = await json('/api/v1/events', {
  method: 'POST',
  headers: {
    cookie: sessionCookie,
    origin: base,
    'content-type': 'application/json',
    'idempotency-key': `smoke-${Date.now()}`,
  },
  body: JSON.stringify({
    eventId: `smoke-${Date.now()}`,
    eventName: 'qualified_lead',
    eventTime: new Date().toISOString(),
    anonymousId: 'smoke-anonymous',
    source: 'smoke_test',
    campaign: { source: 'google', medium: 'cpc', campaignId: 'cmp_search_brand' },
    properties: { estimatedValue: 50000 },
    identifiers: { email: 'smoke@example.com' },
    consent: { analytics: true, advertising: false },
  }),
});
ensure(event.response.ok, `Event ingestion failed: ${JSON.stringify(event.body)}`);
const logout = await json('/api/v1/auth/logout', {
  method: 'POST',
  headers: { cookie: sessionCookie, origin: base },
});
ensure(logout.response.ok, 'Logout failed');
console.log(
  JSON.stringify({
    status: 'ok',
    checks: ['live', 'ready', 'login', 'dashboard', 'event_ingestion', 'logout'],
  }),
);
