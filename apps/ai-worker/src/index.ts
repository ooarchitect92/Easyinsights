import { createServer } from 'node:http';
import { closeMongo, getDb } from '@easyinsights/core';
import { runAiWorker } from './worker.js';
const controller = new AbortController();
const port = Number(process.env.HEALTH_PORT || 8082);
let stopping = false;
const server = createServer(async (req, res) => {
  if (req.url === '/health/live') {
    res
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ status: 'ok', service: 'ai-worker' }));
    return;
  }
  if (req.url === '/health/ready') {
    try {
      await (await getDb()).command({ ping: 1 });
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ status: 'ready' }));
    } catch {
      res
        .writeHead(503, { 'content-type': 'application/json' })
        .end(JSON.stringify({ status: 'not_ready' }));
    }
    return;
  }
  res.writeHead(404).end();
});
async function shutdown() {
  if (stopping) return;
  stopping = true;
  controller.abort();
  server.close();
  await closeMongo();
}
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
server.listen(port);
try {
  await runAiWorker(controller.signal);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
  await shutdown();
}
