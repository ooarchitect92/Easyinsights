import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAnthropicReviewer } from './anthropic/messages.js';
import {
  extractMultimodalGoogle,
  generateImageGoogle,
  transcribeGoogle,
} from './google/generate.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('hosted provider adapters', () => {
  it('parses a validated Anthropic reviewer response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              model: 'claude-fable-5-1',
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    verdict: 'needs_human_review',
                    issues: [],
                    rationale: 'evidence gap',
                    evidence_ids: ['e1'],
                  }),
                },
              ],
              usage: { input_tokens: 10, output_tokens: 5 },
            }),
            { status: 200, headers: { 'request-id': 'req_a' } },
          ),
      ),
    );
    const result = await runAnthropicReviewer({
      model: 'claude-fable-5-1',
      recommendation: { id: 'r1' },
      evidence: { e1: true },
      timeoutMs: 1000,
      apiKey: 'test',
    });
    expect(result.output.verdict).toBe('needs_human_review');
    expect(result.providerRequestId).toBe('req_a');
  });

  it('sends multimodal inline data to Google and parses JSON evidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init: RequestInit) => {
        const payload = JSON.parse(String(init.body));
        expect(payload.contents[0].parts[1].inlineData.mimeType).toBe('image/png');
        return new Response(
          JSON.stringify({
            modelVersion: 'gemini-3.8-flash',
            candidates: [{ content: { parts: [{ text: '{"items":[{"label":"chart"}]}' }] } }],
          }),
          { status: 200 },
        );
      }),
    );
    const result = await extractMultimodalGoogle({
      model: 'gemini-3.8-flash',
      apiKey: 'test',
      timeoutMs: 1000,
      instruction: 'extract',
      media: [{ mimeType: 'image/png', dataBase64: 'AA==' }],
    });
    expect(result.output.items[0].label).toBe('chart');
  });

  it('returns structured fallback for plain transcription text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              modelVersion: 'gemini-3.5-transcribe',
              candidates: [{ content: { parts: [{ text: 'hello world' }] } }],
            }),
            { status: 200 },
          ),
      ),
    );
    const result = await transcribeGoogle({
      model: 'gemini-3.5-transcribe',
      apiKey: 'test',
      timeoutMs: 1000,
      audioMimeType: 'audio/wav',
      audioBase64: 'AA==',
    });
    expect(result.output.transcript).toBe('hello world');
  });

  it('extracts generated image payload without claiming performance', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              modelVersion: 'gemini-3-pro-image',
              candidates: [
                { content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AA==' } }] } },
              ],
            }),
            { status: 200 },
          ),
      ),
    );
    const result = await generateImageGoogle({
      model: 'gemini-3-pro-image',
      apiKey: 'test',
      timeoutMs: 1000,
      prompt: 'brand-safe draft',
    });
    expect(result.output.mimeType).toBe('image/png');
  });
});
