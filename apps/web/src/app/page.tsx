import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Cable,
  ChartNoAxesCombined,
  CheckCircle2,
  DatabaseZap,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
const capabilities = [
  [
    'Trusted data foundation',
    'Collect canonical events, observe every connector and retain source-to-report lineage.',
    DatabaseZap,
  ],
  [
    'Journey and attribution',
    'Stitch online and offline touchpoints and compare explainable attribution models.',
    ChartNoAxesCombined,
  ],
  [
    'Governed AI agents',
    'Move from advice to approval-controlled action with evidence, policy and rollback.',
    Bot,
  ],
  [
    'Closed-loop activation',
    'Return qualified outcomes to destinations with consent, idempotency and delivery diagnostics.',
    Cable,
  ],
] as const;
export default function Home() {
  return (
    <main className="marketing">
      <nav className="marketing-nav">
        <Link href="/" className="brand dark">
          <span className="brand-mark">E</span>
          <span>
            Easyinsights<small>Marketing OS</small>
          </span>
        </Link>
        <div>
          <a href="#platform">Platform</a>
          <a href="#governance">Governance</a>
          <Link className="button ghost" href="/login">
            Sign in
          </Link>
          <Link className="button primary" href="/login">
            Open workspace
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={14} /> AI-native growth intelligence
          </span>
          <h1>Turn fragmented marketing data into trusted, governed growth actions.</h1>
          <p>
            Unify campaign, CRM, website, call and offline outcomes. Explain what happened, identify
            what matters, and safely activate the next best action.
          </p>
          <div className="hero-actions">
            <Link className="button primary large" href="/login">
              Explore the platform <ArrowRight size={17} />
            </Link>
            <a className="button ghost large" href="#platform">
              View capabilities
            </a>
          </div>
          <div className="trust-row">
            <span>
              <CheckCircle2 />
              Multi-tenant by design
            </span>
            <span>
              <CheckCircle2 />
              MongoDB system of record
            </span>
            <span>
              <CheckCircle2 />
              Approval-controlled activation
            </span>
          </div>
        </div>
        <div className="hero-panel">
          <div className="hero-panel-top">
            <span>Growth command centre</span>
            <span className="live-pill">Live</span>
          </div>
          <div className="hero-metrics">
            <article>
              <span>Attributed revenue</span>
              <strong>₹48.2L</strong>
              <small>+18.4% this month</small>
            </article>
            <article>
              <span>Qualified leads</span>
              <strong>1,284</strong>
              <small>82% identity coverage</small>
            </article>
            <article>
              <span>Blended ROAS</span>
              <strong>4.87×</strong>
              <small>Last-touch: 5.19×</small>
            </article>
            <article>
              <span>Data health</span>
              <strong>94/100</strong>
              <small>2 issues need review</small>
            </article>
          </div>
          <div className="mini-chart">
            {[34, 52, 44, 66, 58, 76, 72, 91, 80, 96, 88, 100].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="agent-card">
            <Bot size={18} />
            <div>
              <strong>Budget Recommendation Agent</strong>
              <p>
                Shift 8% from high-frequency prospecting into qualified-lead retargeting. Estimated
                impact: +₹2.1L.
              </p>
            </div>
            <span>Approval required</span>
          </div>
        </div>
      </section>
      <section className="logo-strip">
        <span>One trustworthy operating layer for</span>
        <strong>Advertising</strong>
        <strong>CRM</strong>
        <strong>Analytics</strong>
        <strong>Calls</strong>
        <strong>Revenue</strong>
      </section>
      <section id="platform" className="section">
        <div className="section-heading">
          <span className="eyebrow">Connected intelligence</span>
          <h2>From raw signal to measurable outcome</h2>
          <p>
            The platform preserves lineage at every step: raw event, canonical event, identity
            decision, attribution credit and activation response.
          </p>
        </div>
        <div className="capability-grid">
          {capabilities.map(([title, description, Icon]) => (
            <article key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{description}</p>
              <a href="#governance">
                Learn how it works <ArrowRight size={14} />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section id="governance" className="governance">
        <div>
          <span className="eyebrow">
            <ShieldCheck size={14} /> Safety built into execution
          </span>
          <h2>AI can recommend, prepare, or act—only inside policy.</h2>
          <p>
            Every high-impact action records its evidence, confidence, predicted impact, approver,
            execution outcome and rollback path.
          </p>
          <ul>
            <li>Advisory, approval and policy-bound autonomy</li>
            <li>Four-eyes control for high-risk decisions</li>
            <li>Consent filtering and destination allowlists</li>
            <li>Immutable, hash-chained audit evidence</li>
          </ul>
        </div>
        <div className="policy-card">
          <header>
            <ShieldCheck />
            <span>Activation policy</span>
            <b>Enforced</b>
          </header>
          <dl>
            <div>
              <dt>Maximum daily budget change</dt>
              <dd>10%</dd>
            </div>
            <div>
              <dt>Minimum confidence</dt>
              <dd>90%</dd>
            </div>
            <div>
              <dt>Minimum sample size</dt>
              <dd>1,000</dd>
            </div>
            <div>
              <dt>Approval threshold</dt>
              <dd>₹50,000</dd>
            </div>
            <div>
              <dt>Live provider calls</dt>
              <dd>Credential + adapter gated</dd>
            </div>
          </dl>
        </div>
      </section>
      <footer>
        <span>Easyinsights Marketing OS</span>
        <p>Independent marketing intelligence, attribution and activation platform.</p>
        <Link href="/login">
          Open workspace <ArrowRight size={14} />
        </Link>
      </footer>
    </main>
  );
}
