import Link from 'next/link';
export default function Forbidden() {
  return (
    <div className="empty-panel">
      <h1>Access restricted</h1>
      <p>Your current role does not include permission for this workspace capability.</p>
      <Link className="button primary" href="/app">
        Return to overview
      </Link>
    </div>
  );
}
