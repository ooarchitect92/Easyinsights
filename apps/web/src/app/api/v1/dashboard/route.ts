import { handleApi } from '@/server/api';
import { dashboardData } from '@/server/data';
export async function GET(request: Request) {
  return handleApi(request, async ({ principal }) => dashboardData(principal), {
    permission: 'workspace:read',
  });
}
