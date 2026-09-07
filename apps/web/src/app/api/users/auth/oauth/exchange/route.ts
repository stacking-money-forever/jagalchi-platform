import { establishWebSession } from '@/server/web-session-transport';

export function POST(request: Parameters<typeof establishWebSession>[0]) {
  return establishWebSession(request, '/api/users/auth/oauth/exchange', 'POST');
}
