'use client';

import type { GithubRepository } from '@/api/github';
import { Button } from '@/components/ui/button';

import { repositoryModeLabel } from '../lib/proposal-presenter';
import { bindingForMode, isRepositoryBindingComplete } from '../lib/repository-modes';

import type { RepositoryBindingDto, RepositoryMode } from '@jagalchi/api-client';

export function RepositoryBindSection({
  allowedModes,
  binding,
  repositories,
  selectedRepositoryId,
  onSelectRepository,
  onChangeMode,
  onContinue,
}: {
  allowedModes: RepositoryMode[];
  binding: RepositoryBindingDto;
  repositories: GithubRepository[];
  selectedRepositoryId: string;
  onSelectRepository: (value: string) => void;
  onChangeMode: (mode: RepositoryMode) => void;
  onContinue: () => void;
}) {
  const modeLabels = allowedModes.map((mode) => repositoryModeLabel(mode)).join(' → ');

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">저장소 연결</h2>
      <p className="text-muted-foreground text-sm">
        모드 우선순위: {modeLabels}. 기존 저장소를 연결한 뒤 계획을 컴파일할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        {allowedModes.map((mode) => (
          <Button
            key={mode}
            variant={binding.mode === mode ? 'solid' : 'outline'}
            onClick={() => onChangeMode(mode)}
          >
            {repositoryModeLabel(mode)}
          </Button>
        ))}
      </div>
      {binding.mode === 'EXISTING_OWNED' ? (
        <label className="block space-y-2">
          <span className="text-sm font-semibold">GitHub 저장소</span>
          <select
            className="border-border bg-background w-full rounded-lg border px-3 py-2 text-sm"
            value={selectedRepositoryId}
            onChange={(event) => onSelectRepository(event.target.value)}
          >
            <option value="">저장소 선택</option>
            {repositories.map((repo) => (
              <option key={repo.repositoryId} value={repo.repositoryId}>
                {repo.fullName}
              </option>
            ))}
          </select>
          {repositories.length === 0 ? (
            <p className="text-muted-foreground text-xs" role="status">
              연결 가능한 저장소가 없습니다. GitHub App 설치 후 다시 시도해 주세요.
            </p>
          ) : null}
        </label>
      ) : (
        <p className="text-muted-foreground text-sm">
          {repositoryModeLabel(binding.mode)} 모드는 별도 저장소 선택 없이 진행할 수 있습니다.
        </p>
      )}
      <Button
        disabled={
          binding.mode === 'EXISTING_OWNED' &&
          !isRepositoryBindingComplete(
            binding.mode,
            bindingForMode(binding.mode, selectedRepositoryId),
          )
        }
        onClick={onContinue}
      >
        범위 확인으로 계속
      </Button>
    </section>
  );
}
