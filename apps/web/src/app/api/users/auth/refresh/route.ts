import { establishWebSession } from '@/server/web-session-transport';

export function PATCH(request: Parameters<typeof establishWebSession>[0]) {
  return establishWebSession(request, '/api/users/auth/refresh', 'PATCH', true);
}
