'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ApiActionButton({
  endpoint,
  label,
  body,
  confirmText,
}: {
  endpoint: string;
  label: string;
  body?: Record<string, unknown>;
  confirmText?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setState('working');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify(body ?? {}),
    });
    setState(response.ok ? 'done' : 'error');
    if (response.ok) router.refresh();
  }
  return (
    <button className="button secondary compact" onClick={run} disabled={state === 'working'}>
      {state === 'working'
        ? 'Working…'
        : state === 'done'
          ? 'Queued'
          : state === 'error'
            ? 'Retry'
            : label}
    </button>
  );
}
