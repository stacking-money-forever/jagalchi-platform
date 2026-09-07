import type { ProjectRunProjection } from '@jagalchi/api-client';

/** Career target fields on projection.target (OpenAPI models target as generic object). */
export type ProjectRunCareerTarget = {
  company?: string;
  role?: string;
};

export function readCareerTarget(
  target: ProjectRunProjection['target'],
): ProjectRunCareerTarget | undefined {
  if (!target || typeof target !== 'object') return undefined;
  const record = target as Record<string, unknown>;
  const company = typeof record.company === 'string' ? record.company : undefined;
  const role = typeof record.role === 'string' ? record.role : undefined;
  if (!company && !role) return undefined;
  return { company, role };
}
