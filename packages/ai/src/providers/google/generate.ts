import { ProviderExecutionError } from '../errors.js';

type InlinePart = { mimeType: string; dataBase64: string };

async function generate(input: {
  model: string;
  apiKey: string;
  timeoutMs: number;
  parts: Array<{ text: string } | InlinePart>;
  responseModalities?: string[];
  systemInstruction?: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const encoded = encodeURIComponent(input.model);
    let response: Response;
    try {
      response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encoded + ':generateContent',
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'x-goog-api-key': input.apiKey, 'content-type': 'application/json' },
          body: JSON.stringify({
            ...(input.systemInstruction
              ? { systemInstruction: { parts: [{ text: input.systemInstruction }] } }
              : {}),
            contents: [
              {
                role: 'user',
                parts: input.parts.map((part) =>
                  'text' in part
                    ? part
                    : { inlineData: { mimeType: part.mimeType, data: part.dataBase64 } },
                ),
              },
            ],
            generationConfig: {
              temperature: 0,
              ...(input.responseModalities ? { responseModalities: input.responseModalities } : {}),
            },
          }),
        },
      );
    } catch (error) {
      throw new ProviderExecutionError(
        error instanceof Error
          ? error.message
          : 'Google model request failed before acknowledgement.',
        true,
      );
    }
    const requestId =
      response.headers.get('x-request-id') ||
      response.headers.get('x-goog-request-id') ||
      undefined;
    const body: any = await response.json().catch(() => null);
    if (!response.ok)
      throw new ProviderExecutionError(
        String(body?.error?.message || 'Google model request failed.'),
        false,
        requestId,
        response.status,
      );
    return { requestId, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function extractMultimodalGoogle(input: {
  model: string;
  apiKey: string;
  timeoutMs: number;
  instruction: string;
  media: InlinePart[];
}) {
  const { requestId, body } = await generate({
    model: input.model,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    systemInstruction:
      'Extract only visible or audible evidence. Preserve locations or timestamps when available and state uncertainty explicitly. Return JSON only.',
    parts: [{ text: input.instruction }, ...input.media],
  });
  const text = (body?.candidates?.[0]?.content?.parts || []).find(
    (part: any) => typeof part?.text === 'string',
  )?.text;
  if (typeof text !== 'string')
    throw new ProviderExecutionError(
      'Google multimodal extraction returned no text result.',
      false,
      requestId,
    );
  let output: any;
  try {
    output = JSON.parse(text);
  } catch {
    throw new ProviderExecutionError(
      'Google multimodal extraction was not valid JSON.',
      false,
      requestId,
    );
  }
  return {
    providerRequestId: requestId,
    resolvedModel: String(body?.modelVersion || input.model),
    output,
    usage: body?.usageMetadata || null,
  };
}

export async function transcribeGoogle(input: {
  model: string;
  apiKey: string;
  timeoutMs: number;
  audioMimeType: string;
  audioBase64: string;
  languageHint?: string;
}) {
  const { requestId, body } = await generate({
    model: input.model,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    systemInstruction:
      'Transcribe the supplied audio. Preserve speaker and timestamp information when the model provides it. Return JSON with transcript, segments, language and warnings.',
    parts: [
      {
        text:
          'Transcribe this consented call recording.' +
          (input.languageHint ? ' Language hint: ' + input.languageHint : ''),
      },
      { mimeType: input.audioMimeType, dataBase64: input.audioBase64 },
    ],
  });
  const text = (body?.candidates?.[0]?.content?.parts || []).find(
    (part: any) => typeof part?.text === 'string',
  )?.text;
  if (typeof text !== 'string')
    throw new ProviderExecutionError(
      'Google transcription returned no text result.',
      false,
      requestId,
    );
  let output: any;
  try {
    output = JSON.parse(text);
  } catch {
    output = {
      transcript: text,
      segments: [],
      language: input.languageHint || null,
      warnings: ['Provider returned unstructured transcript text.'],
    };
  }
  return {
    providerRequestId: requestId,
    resolvedModel: String(body?.modelVersion || input.model),
    output,
    usage: body?.usageMetadata || null,
  };
}

export async function generateImageGoogle(input: {
  model: string;
  apiKey: string;
  timeoutMs: number;
  prompt: string;
}) {
  const { requestId, body } = await generate({
    model: input.model,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs,
    systemInstruction:
      'Generate a draft creative asset that follows the supplied prompt. Do not claim predicted advertising performance.',
    parts: [{ text: input.prompt }],
    responseModalities: ['TEXT', 'IMAGE'],
  });
  const parts = body?.candidates?.[0]?.content?.parts || [];
  const image = parts.find((part: any) => part?.inlineData?.data);
  if (!image)
    throw new ProviderExecutionError(
      'Google image generation returned no image payload.',
      false,
      requestId,
    );
  return {
    providerRequestId: requestId,
    resolvedModel: String(body?.modelVersion || input.model),
    output: {
      mimeType: String(image.inlineData.mimeType || 'image/png'),
      dataBase64: String(image.inlineData.data),
      text: parts.find((part: any) => typeof part?.text === 'string')?.text || null,
    },
    usage: body?.usageMetadata || null,
  };
}
