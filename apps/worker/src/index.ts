import { createServer } from 'node:http';
import { closeMongo, closeRedis, getDb, getRedis } from '@easyinsights/core';
import { runConsumer } from './consumer.js';
import { log } from './log.js';
import { runOutbox } from './outbox.js';
const mode = process.env.WORKER_MODE ?? 'all';
const port = Number(process.env.HEALTH_PORT ?? 8081);
const controller = new AbortController();
let shuttingDown = false;
const server = createServer(async (request, response) => {
  if (request.url === '/health/live') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({ status: 'ok', service: `worker-${mode}`, time: new Date().toISOString() }),
    );
    return;
  }
  if (request.url === '/health/ready') {
    let ready = true;
    const checks: Record<string, string> = {};
    try {
      await (await getDb()).command({ ping: 1 });
      checks.mongodb = 'ok';
    } catch {
      ready = false;
      checks.mongodb = 'failed';
    }
    try {
      await getRedis().ping();
      checks.redis = 'ok';
    } catch {
      ready = false;
      checks.redis = 'failed';
    }
    response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: ready ? 'ready' : 'not_ready', checks, mode }));
    return;
  }
  response.writeHead(404).end();
});
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', 'shutdown requested', { signal, mode });
  controller.abort();
  server.close();
  await Promise.allSettled([closeMongo(), closeRedis()]);
}
for (const signal of ['SIGTERM', 'SIGINT'] as const)
  process.on(signal, () => {
    void shutdown(signal);
  });
server.listen(port, () => log('info', 'health server listening', { port, mode }));
const tasks: Promise<void>[] = [];
if (mode === 'outbox' || mode === 'all') tasks.push(runOutbox(controller.signal));
if (mode === 'consumer' || mode === 'all') tasks.push(runConsumer(controller.signal));
if (!tasks.length) {
  log('error', 'invalid worker mode', { mode });
  process.exitCode = 1;
  await shutdown('invalid_mode');
} else {
  try {
    await Promise.all(tasks);
  } catch (error) {
    log('error', 'worker crashed', {
      mode,
      error: error instanceof Error ? error.stack : String(error),
    });
    process.exitCode = 1;
    await shutdown('worker_error');
  }
}
