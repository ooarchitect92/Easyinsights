import type { ReactNode } from 'react';

export interface Metric {
  label: string;
  value: string | number;
  detail?: string;
}

export interface Column {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

interface CapabilityPageProps {
  eyebrow?: string;
  title: string;
  description: string;
  metrics?: Metric[];
  columns?: Column[];
  rows?: Record<string, unknown>[];
  actions?: ReactNode;
  notice?: ReactNode;
  children?: ReactNode;
}

export function CapabilityPage({
  eyebrow,
  title,
  description,
  metrics = [],
  columns = [],
  rows = [],
  actions,
  notice,
  children,
}: CapabilityPageProps) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions ? <div className="header-actions">{actions}</div> : null}
      </header>

      {notice ? <div className="notice">{notice}</div> : null}

      {metrics.length > 0 ? (
        <section className="metrics-grid">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.detail ? <small>{metric.detail}</small> : null}
            </article>
          ))}
        </section>
      ) : null}

      {children}

      {columns.length > 0 ? (
        <section className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, index) => (
                    <tr key={String(row.id ?? index)}>
                      {columns.map((column) => (
                        <td key={column.key}>
                          {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length}>
                      <div className="empty-state">
                        <strong>No records yet</strong>
                        <span>
                          Connect a source, ingest events, or use the development seed to populate
                          this view.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function StatusBadge({ value }: { value: unknown }) {
  const text = String(value ?? 'unknown').replaceAll('_', ' ');
  const kind = ['healthy', 'active', 'completed', 'published', 'approved', 'success'].includes(
    String(value),
  )
    ? 'good'
    : ['failed', 'critical', 'rejected', 'blocked'].includes(String(value))
      ? 'bad'
      : ['pending', 'warning', 'degraded', 'queued', 'processing'].includes(String(value))
        ? 'warn'
        : 'neutral';

  return <span className={`status ${kind}`}>{text}</span>;
}
