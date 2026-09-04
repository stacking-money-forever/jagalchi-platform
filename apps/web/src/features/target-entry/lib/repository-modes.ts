import {
  REPOSITORY_MODE_ORDER,
  type RepositoryBindingDto,
  type RepositoryMode,
} from '@jagalchi/api-client';

export function sortRepositoryModes(modes: RepositoryMode[]): RepositoryMode[] {
  const allowed = new Set(modes);
  return REPOSITORY_MODE_ORDER.filter((mode) => allowed.has(mode));
}

export function isRepositoryBindingComplete(
  mode: RepositoryMode,
  binding: RepositoryBindingDto,
): boolean {
  if (binding.mode !== mode) return false;
  if (mode === 'EXISTING_OWNED') {
    return typeof binding.githubRepositoryId === 'string' && binding.githubRepositoryId.length > 0;
  }
  return true;
}

export function bindingForMode(
  mode: RepositoryMode,
  githubRepositoryId?: string,
): RepositoryBindingDto {
  if (mode === 'EXISTING_OWNED') {
    return { mode, githubRepositoryId: githubRepositoryId ?? '' };
  }
  return { mode };
}
