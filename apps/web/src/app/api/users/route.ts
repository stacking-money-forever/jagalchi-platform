import { establishWebSession } from '@/server/web-session-transport';

import { proxyRequest } from '../[...path]/route';

export const GET = proxyRequest;
export const DELETE = proxyRequest;

export function POST(request: Parameters<typeof establishWebSession>[0]) {
  return establishWebSession(request, '/api/users', 'POST');
}
