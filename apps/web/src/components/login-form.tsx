'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
    });
    const body = (await response.json()) as { ok: boolean; error?: { message?: string } };
    if (!response.ok) {
      setError(body.error?.message ?? 'Unable to sign in.');
      setPending(false);
      return;
    }
    router.replace('/app');
    router.refresh();
  }
  return (
    <form className="auth-form" onSubmit={submit}>
      <label>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue="admin@easyinsights.local"
          required
        />
      </label>
      <label>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue="ChangeMe-Strong-2026!"
          minLength={12}
          required
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="button primary" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in securely'}
      </button>
      <p className="muted tiny">
        The seeded credentials are development-only and must be replaced outside local environments.
      </p>
    </form>
  );
}
