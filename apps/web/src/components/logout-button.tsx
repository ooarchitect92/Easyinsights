'use client';
import { useRouter } from 'next/navigation';
export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="nav-logout"
      onClick={async () => {
        await fetch('/api/v1/auth/logout', { method: 'POST' });
        router.replace('/login');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
