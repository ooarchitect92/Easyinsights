import { AppShell } from '@/components/app-shell';
import { requireServerPrincipal } from '@/server/auth';
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const principal = await requireServerPrincipal();
  return <AppShell principal={principal}>{children}</AppShell>;
}
