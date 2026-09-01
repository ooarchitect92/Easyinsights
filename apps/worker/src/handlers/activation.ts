import type { ClientSession, Db, Document } from 'mongodb';
import { config, tenantFilter } from '@easyinsights/core';
import type { RuntimeMessage } from '../message.js';
import { markRun, requiredString } from './shared.js';
export async function handleActivation(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  const runId = requiredString(message.payload.runId, 'runId');
  const scope = tenantFilter(message.scope);
  const run = await db.collection('activation_runs').findOne({ ...scope, id: runId }, { session });
  if (!run) throw new Error('Activation run not found');
  const connector = await db
    .collection('connectors')
    .findOne({ ...scope, id: run.destinationConnectorId }, { session });
  if (!connector) {
    await markRun(db, session, 'activation_runs', runId, 'blocked', {
      completedAt: new Date(),
      blockReason: 'destination_not_found',
    });
    return;
  }
  if (run.dryRun === true) {
    await markRun(db, session, 'activation_runs', runId, 'completed', {
      completedAt: new Date(),
      deliveryMode: 'dry_run',
      destinationProvider: connector.provider,
      diagnostics: {
        validated: true,
        externalCallPerformed: false,
        payloadKeys: Object.keys((run.payload ?? {}) as Document),
      },
    });
    return;
  }
  const approval = run.approvalId
    ? await db
        .collection('approvals')
        .findOne({ ...scope, id: run.approvalId, status: 'approved' }, { session })
    : null;
  if (!approval) {
    await markRun(db, session, 'activation_runs', runId, 'awaiting_approval', {
      blockReason: 'approved_action_required',
    });
    return;
  }
  if (!config.liveActivationEnabled) {
    await markRun(db, session, 'activation_runs', runId, 'blocked', {
      completedAt: new Date(),
      blockReason: 'live_activation_disabled_by_deployment',
    });
    return;
  }
  if (!connector.credentialReference) {
    await markRun(db, session, 'activation_runs', runId, 'blocked', {
      completedAt: new Date(),
      blockReason: 'credential_reference_required',
    });
    return;
  }
  await markRun(db, session, 'activation_runs', runId, 'blocked', {
    completedAt: new Date(),
    blockReason: 'production_provider_adapter_required',
    diagnostics: {
      externalCallPerformed: false,
      destinationProvider: connector.provider,
      note: 'The repository intentionally refuses generic outbound delivery. Each provider requires a reviewed adapter with provider-specific idempotency, consent mapping and diagnostics.',
    },
  });
}
