import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BarChart3, ShieldCheck, Workflow } from 'lucide-react';
import { LoginForm } from '@/components/login-form';
import { getServerPrincipal } from '@/server/auth';
export default async function LoginPage() {
  if (await getServerPrincipal()) redirect('/app');
  return (
    <main className="auth-page">
      <section className="auth-side">
        <Link href="/" className="brand dark">
          <span className="brand-mark">E</span>
          <span>
            Easyinsights<small>Marketing OS</small>
          </span>
        </Link>
        <div>
          <span className="eyebrow">Growth intelligence, governed</span>
          <h1>One secure workspace for data, attribution and activation.</h1>
          <div className="auth-points">
            <p>
              <BarChart3 />
              Explain channel and journey contribution.
            </p>
            <p>
              <Workflow />
              Orchestrate approval-aware workflows.
            </p>
            <p>
              <ShieldCheck />
              Preserve consent, evidence and audit history.
            </p>
          </div>
        </div>
        <small>Local development uses a seeded organization and workspace.</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">Welcome back</span>
          <h2>Sign in to your workspace</h2>
          <p>
            Use your organization account. Sessions are opaque, database-backed and time-limited.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
