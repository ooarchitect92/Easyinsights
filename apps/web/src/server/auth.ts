import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Permission, Principal } from '@easyinsights/contracts';
import { config, hasPermission, resolvePrincipal } from '@easyinsights/core';
export async function getServerPrincipal(): Promise<Principal | null> {
  const store = await cookies();
  return resolvePrincipal(store.get(config.sessionCookieName)?.value);
}
export async function requireServerPrincipal(permission?: Permission): Promise<Principal> {
  const principal = await getServerPrincipal();
  if (!principal) redirect('/login');
  if (permission && !hasPermission(principal, permission)) redirect('/app/forbidden');
  return principal;
}
