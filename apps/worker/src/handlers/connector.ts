import type { ClientSession, Db, Document } from 'mongodb';
import { tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
export async function handleConnector(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const connectorId = requiredString(message.payload.connectorId, 'connectorId');
  const scope = tenantFilter(message.scope);
  const connector = await db
    .collection('connectors')
    .findOne({ ...scope, id: connectorId }, { session });
  if (!connector) throw new Error('Connector not found');
  await markRun(db, session, 'connector_runs', runId, 'processing', {
    startedAt: new Date(),
    attempt: 1,
  });
  const diagnostics: Document = {
    configurationPresent: Boolean(connector.configuration),
    credentialReferencePresent: Boolean(connector.credentialReference),
    providerAdapter:
      connector.provider === 'webhook' || connector.provider === 'csv' ? 'available' : 'required',
    apiVersionMonitoring: 'configured',
  };
  let status = 'healthy';
  let score = 100;
  let runStatus = 'completed';
  if (connector.authType !== 'none' && !connector.credentialReference) {
    status = 'credential_required';
    score = 0;
    runStatus = 'blocked';
    diagnostics.reason = 'No credential reference is configured.';
  } else if (!['webhook', 'csv', 'custom'].includes(String(connector.provider))) {
    status = 'degraded';
    score = 65;
    diagnostics.reason =
      'A production provider adapter must be configured for live synchronization.';
  }
  const now = new Date();
  await db.collection('connectors').updateOne(
    { ...scope, id: connectorId },
    {
      $set: {
        status,
        healthScore: score,
        lastCheckedAt: now,
        lastSyncAt: runStatus === 'completed' ? now : connector.lastSyncAt,
        updatedAt: now,
        diagnostics,
      },
    },
    { session },
  );
  await markRun(db, session, 'connector_runs', runId, runStatus, { completedAt: now, diagnostics });
}
