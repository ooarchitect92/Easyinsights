import { ProviderExecutionError } from '../errors.js';
async function request(path: string, body: unknown, apiKey: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch('https://api.voyageai.com/v1/' + path, {
        method: 'POST',
        signal: controller.signal,
        headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new ProviderExecutionError(
        error instanceof Error ? error.message : 'Voyage request failed before acknowledgement.',
        true,
      );
    }
    const requestId = response.headers.get('x-request-id') || undefined;
    const json: any = await response.json().catch(() => null);
    if (!response.ok)
      throw new ProviderExecutionError(
        String(json?.detail || json?.message || 'Voyage request failed.'),
        false,
        requestId,
        response.status,
      );
    return { requestId, json };
  } finally {
    clearTimeout(timer);
  }
}
export async function embedVoyage(input: { texts: string[]; apiKey: string; timeoutMs: number }) {
  const { requestId, json } = await request(
    'embeddings',
    { input: input.texts, model: 'voyage-4-large', input_type: 'document' },
    input.apiKey,
    input.timeoutMs,
  );
  return {
    providerRequestId: requestId,
    resolvedModel: String(json?.model || 'voyage-4-large'),
    embeddings: (json?.data || []).map((x: any) => x.embedding),
    usage: json?.usage || null,
  };
}
export async function rerankVoyage(input: {
  query: string;
  documents: string[];
  apiKey: string;
  timeoutMs: number;
  topK?: number;
}) {
  const { requestId, json } = await request(
    'rerank',
    { query: input.query, documents: input.documents, model: 'rerank-2.5', top_k: input.topK },
    input.apiKey,
    input.timeoutMs,
  );
  return {
    providerRequestId: requestId,
    resolvedModel: String(json?.model || 'rerank-2.5'),
    results: json?.data || [],
    usage: json?.usage || null,
  };
}
