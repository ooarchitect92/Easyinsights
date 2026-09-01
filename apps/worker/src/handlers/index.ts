import type { ClientSession, Db } from 'mongodb';
import type { RuntimeMessage } from '../message.js';
import { handleActivation } from './activation.js';
import { handleAgent } from './agent.js';
import { handleAttribution } from './attribution.js';
import { handleAudience } from './audience.js';
import { handleCanonical } from './canonical.js';
import { handleConnector } from './connector.js';
import { handleReport } from './report.js';
import { handleWorkflow } from './workflow.js';
export async function dispatch(
  db: Db,
  session: ClientSession,
  message: RuntimeMessage,
): Promise<void> {
  switch (message.type) {
    case 'canonical.event.created':
      return handleCanonical(db, session, message);
    case 'attribution.run.requested':
      return handleAttribution(db, session, message);
    case 'audience.evaluate.requested':
      return handleAudience(db, session, message);
    case 'workflow.execute.requested':
    case 'workflow.resume.requested':
      return handleWorkflow(db, session, message);
    case 'agent.execute.requested':
    case 'agent.action.approved':
      return handleAgent(db, session, message);
    case 'connector.sync.requested':
      return handleConnector(db, session, message);
    case 'activation.execute.requested':
      return handleActivation(db, session, message);
    case 'report.generate.requested':
      return handleReport(db, session, message);
    default:
      throw new Error(`Unsupported message type: ${message.type}`);
  }
}
