export function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({ level, message, time: new Date().toISOString(), ...context }));
}
