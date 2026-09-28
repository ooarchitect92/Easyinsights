import { ProviderExecutionError } from '../errors.js';

type ReviewerOutput = {
  verdict: 'supported' | 'needs_human_review' | 'blocked';
  issues: Array<{ code: string; message: string; severity: 'info' | 'warning' | 'critical' }>;
  rationale: string;
  evidence_ids: string[];
};

export async function runAnthropicReviewer(input: {
  model: string;
  recommendation: Record<string, unknown>;
  evidence: Record<string, unknown>;
  timeoutMs: number;
  apiKey: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': input.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: input.model,
          max_tokens: 1800,
          temperature: 0,
          system:
            'You are the Easyinsights recommendation reviewer. Inspect only the supplied immutable recommendation and evidence. Do not change backend numbers and do not authorize actions. Return JSON only with verdict, issues, rationale and evidence_ids.',
          messages: [
            {
              role: 'user',
              content: JSON.stringify({
                recommendation: input.recommendation,
                evidence: input.evidence,
              }),
            },
          ],
        }),
      });
    } catch (error) {
      throw new ProviderExecutionError(
        error instanceof Error ? error.message : 'Anthropic request failed before acknowledgement.',
        true,
      );
    }
    const requestId =
      response.headers.get('request-id') || response.headers.get('x-request-id') || undefined;
    const body: any = await response.json().catch(() => null);
    if (!response.ok)
      throw new ProviderExecutionError(
        String(body?.error?.message || 'Anthropic request failed.'),
        false,
        requestId,
        response.status,
      );
    const text = (body?.content || []).find((item: any) => item?.type === 'text')?.text;
    if (typeof text !== 'string' || !text.trim())
      throw new ProviderExecutionError(
        'Anthropic response did not contain text output.',
        false,
        requestId,
        response.status,
      );
    let parsed: ReviewerOutput;
    try {
      parsed = JSON.parse(text) as ReviewerOutput;
    } catch {
      throw new ProviderExecutionError(
        'Anthropic reviewer response was not valid JSON.',
        false,
        requestId,
        response.status,
      );
    }
    if (
      !['supported', 'needs_human_review', 'blocked'].includes(parsed.verdict) ||
      !Array.isArray(parsed.issues) ||
      !Array.isArray(parsed.evidence_ids)
    )
      throw new ProviderExecutionError(
        'Anthropic reviewer response did not satisfy the reviewer contract.',
        false,
        requestId,
        response.status,
      );
    return {
      providerRequestId: requestId,
      resolvedModel: String(body?.model || input.model),
      output: parsed,
      usage: body?.usage || null,
    };
  } finally {
    clearTimeout(timer);
  }
}
