import { ProviderExecutionError } from '../errors.js';

export async function runSeasonalNaiveForecast(input: {
  values: number[];
  horizon: number;
  seasonLength: number;
  timeoutMs: number;
}) {
  const baseUrl = process.env.ML_SERVICE_URL?.replace(/\/$/, '');
  const token = process.env.ML_INTERNAL_TOKEN;
  if (!baseUrl || !token) throw new ProviderExecutionError('ML service is not configured.', false);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(baseUrl + '/v1/forecast/seasonal-naive', {
        method: 'POST',
        signal: controller.signal,
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({
          values: input.values,
          horizon: input.horizon,
          season_length: input.seasonLength,
        }),
      });
    } catch (error) {
      throw new ProviderExecutionError(
        error instanceof Error ? error.message : 'ML service request failed.',
        true,
      );
    }
    const body: any = await response.json().catch(() => null);
    if (!response.ok)
      throw new ProviderExecutionError(
        String(body?.detail || 'ML service forecast failed.'),
        false,
        undefined,
        response.status,
      );
    return { providerRequestId: undefined, resolvedModel: 'seasonal-naive-v1', output: body, usage: null };
  } finally {
    clearTimeout(timer);
  }
}
