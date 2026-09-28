import { ProviderExecutionError } from '../errors.js';

export type GoogleLiveSession = {
  socket: WebSocket;
  close: () => void;
};

export function openGoogleLiveVoice(input: {
  model: string;
  apiKey: string;
  systemInstruction: string;
  onMessage: (data: unknown) => void;
  onError?: (error: unknown) => void;
}): GoogleLiveSession {
  if (typeof WebSocket === 'undefined')
    throw new ProviderExecutionError('WebSocket support is unavailable in this runtime.', false);
  const url =
    'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=' +
    encodeURIComponent(input.apiKey);
  const socket = new WebSocket(url);
  socket.addEventListener(
    'open',
    () => {
      socket.send(
        JSON.stringify({
          setup: {
            model: 'models/' + input.model,
            generationConfig: { responseModalities: ['AUDIO'] },
            systemInstruction: { parts: [{ text: input.systemInstruction }] },
          },
        }),
      );
    },
    { once: true },
  );
  socket.addEventListener('message', (event) => {
    try {
      input.onMessage(JSON.parse(String(event.data)));
    } catch {
      input.onMessage(event.data);
    }
  });
  socket.addEventListener('error', (event) => input.onError?.(event));
  return { socket, close: () => socket.close(1000, 'session_complete') };
}
