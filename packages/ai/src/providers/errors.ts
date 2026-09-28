export class ProviderExecutionError extends Error {
  constructor(
    message: string,
    public readonly outcomeUnknown: boolean,
    public readonly providerRequestId?: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}
