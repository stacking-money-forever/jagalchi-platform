import 'server-only';

import { cookies } from 'next/headers';

import type { ProjectRunProjection } from '@jagalchi/api-client';

type ProjectRunResult =
  | { status: 'ok'; data: ProjectRunProjection }
  | { status: 'not-found' }
  | { status: 'session-expired' };

export async function getProjectRunForRequest(runId: string): Promise<ProjectRunResult> {
  const accessToken = (await cookies()).get('jagalchi_access')?.value;
  if (!accessToken) return { status: 'session-expired' };

  const apiOrigin = new URL(process.env.API_ORIGIN ?? 'http://localhost:8080').origin;
  const response = await fetch(`${apiOrigin}/api/project-runs/${encodeURIComponent(runId)}`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (response.status === 401) return { status: 'session-expired' };
  if (response.status === 404) return { status: 'not-found' };
  if (!response.ok) throw new Error(`Project Run API failed with ${response.status}`);
  return { status: 'ok', data: (await response.json()) as ProjectRunProjection };
}
