import type { AiTask } from '@easyinsights/contracts';
import { modelAssignment } from '../registry/catalog.js';
import { routeReadiness } from '../registry/readiness.js';
import { runOpenAiAnalyst } from '../providers/openai/responses.js';
export async function executeHosted(input: {
  task: AiTask;
  prompt: string;
  context: Record<string, unknown>;
  evidence: Record<string, unknown>;
  timeoutMs: number;
}) {
  const readiness = routeReadiness(input.task);
  if (!readiness.servingReady)
    return { status: 'blocked' as const, reason: readiness.reasons.join(' '), readiness };
  const assignment = modelAssignment(input.task);
  if (input.task === 'analyst') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
      return {
        status: 'blocked' as const,
        reason: 'OpenAI credential is not configured.',
        readiness,
      };
    const result = await runOpenAiAnalyst({
      model: assignment.requestedIdentifier,
      prompt: input.prompt,
      context: input.context,
      evidence: input.evidence,
      timeoutMs: input.timeoutMs,
      apiKey,
    });
    return { status: 'completed' as const, result, readiness };
  }
  return {
    status: 'blocked' as const,
    reason: 'Execution adapter is not implemented for this task.',
    readiness,
  };
}
