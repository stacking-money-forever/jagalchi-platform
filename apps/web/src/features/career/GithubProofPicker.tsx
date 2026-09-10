'use client';

import { useId, useState, type FormEvent } from 'react';

import { GitBranch, LockKeyhole, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface GithubProofConnection {
  status: 'DISCONNECTED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  accountId?: string;
}

export interface GithubProofRepository {
  id: string;
  nameWithOwner: string;
  isPrivate: boolean;
}

export interface GithubProofPickerProps {
  connection: GithubProofConnection;
  repositories: GithubProofRepository[];
  selectedRepositoryId?: string;
  pullNumber?: string;
  onConnect: () => void;
  onRepositoryChange: (repositoryId: string) => void;
  onPullNumberChange: (pullNumber: string) => void;
  onBind: () => Promise<void> | void;
  isBinding: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function GithubProofPicker({
  connection,
  repositories,
  selectedRepositoryId,
  pullNumber,
  onConnect,
  onRepositoryChange,
  onPullNumberChange,
  onBind,
  isBinding,
  isLoading = false,
  error,
  onRetry,
}: GithubProofPickerProps) {
  const formId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const active = connection.status === 'ACTIVE';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    if (
      !selectedRepositoryId ||
      !pullNumber ||
      !/^\d+$/.test(pullNumber) ||
      Number(pullNumber) < 1
    ) {
      setSubmitError('저장소와 올바른 PR 번호를 선택해주세요.');
      return;
    }
    try {
      await onBind();
    } catch (reason) {
      setSubmitError(reason instanceof Error ? reason.message : 'PR을 연결하지 못했습니다.');
    }
  };

  return (
    <section
      aria-labelledby={`${formId}-heading`}
      className="border-border bg-card rounded-3xl border p-5 sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="bg-primary-subtle text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
          <GitBranch aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h2 id={`${formId}-heading`} className="text-xl font-extrabold">
            GitHub 증거 연결
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            개인 계정에 설치한 읽기 전용 GitHub App으로만 PR 사실을 확인합니다. 조직 설치는 지원하지
            않습니다.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 flex min-h-32 items-center justify-center" role="status">
          <p className="text-muted-foreground text-sm">GitHub 연결 정보를 불러오는 중입니다.</p>
        </div>
      ) : error ? (
        <div className="border-error/30 bg-error-subtle mt-6 rounded-2xl border p-4" role="alert">
          <p className="text-error text-sm font-bold">{error}</p>
          {onRetry ? (
            <Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw aria-hidden="true" /> 다시 시도
            </Button>
          ) : null}
        </div>
      ) : !active ? (
        <div className="bg-muted/60 mt-6 rounded-2xl p-5">
          <p className="font-extrabold">
            {connection.status === 'DISCONNECTED'
              ? '개인 GitHub 계정을 연결해주세요.'
              : 'GitHub 연결을 다시 활성화해야 합니다.'}
          </p>
          <p className="text-muted-foreground mt-2 text-xs leading-5">
            로그인용 OAuth와 저장소 읽기 권한은 다릅니다. App 설치 후 개인 계정 소유 여부를
            확인합니다.
          </p>
          <Button className="mt-4 w-full sm:w-auto" onClick={onConnect}>
            <GitBranch aria-hidden="true" /> GitHub App 연결
          </Button>
        </div>
      ) : repositories.length === 0 ? (
        <div className="border-border mt-6 rounded-2xl border border-dashed p-5 text-center">
          <LockKeyhole aria-hidden="true" className="text-muted-foreground mx-auto size-6" />
          <p className="mt-3 text-sm font-extrabold">허용된 저장소가 없습니다.</p>
          <p className="text-muted-foreground mt-1 text-xs leading-5">
            GitHub App 설정에서 이 개인 계정의 저장소를 하나 이상 허용해주세요.
          </p>
          <Button className="mt-4" variant="outline" onClick={onConnect}>
            저장소 권한 관리
          </Button>
        </div>
      ) : (
        <form className="mt-6" onSubmit={handleSubmit}>
          <p className="text-success text-xs font-bold" role="status">
            GitHub 개인 계정 ID {connection.accountId} 연결됨
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
            <label className="block space-y-2" htmlFor={`${formId}-repository`}>
              <span className="text-sm font-bold">저장소</span>
              <select
                id={`${formId}-repository`}
                value={selectedRepositoryId ?? ''}
                onChange={(event) => onRepositoryChange(event.target.value)}
                className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/40 h-11 w-full rounded-xl border px-3.5 text-sm outline-none focus-visible:ring-3"
                required
              >
                <option value="">저장소 선택</option>
                {repositories.map((repository) => (
                  <option key={repository.id} value={repository.id}>
                    {repository.nameWithOwner}
                    {repository.isPrivate ? ' · 비공개' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2" htmlFor={`${formId}-pull-number`}>
              <span className="text-sm font-bold">PR 번호</span>
              <Input
                id={`${formId}-pull-number`}
                inputMode="numeric"
                pattern="[0-9]+"
                min="1"
                type="number"
                value={pullNumber ?? ''}
                onChange={(event) => onPullNumberChange(event.target.value)}
                placeholder="123"
                required
              />
            </label>
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-5">
            URL을 붙여 넣는 대신 선택한 설치 권한으로 저장소와 PR을 다시 확인합니다.
          </p>
          {submitError ? (
            <p className="text-error mt-3 text-sm font-semibold" role="alert">
              {submitError}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:w-auto" type="submit" loading={isBinding}>
              이 PR 연결하기
            </Button>
            <Button
              className="w-full sm:w-auto"
              type="button"
              variant="outline"
              onClick={onConnect}
            >
              <RefreshCw aria-hidden="true" /> GitHub App 다시 연결
            </Button>
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-5">
            App이 교체됐거나 연결이 만료된 경우 다시 연결해 최신 설치 권한을 확인합니다.
          </p>
        </form>
      )}
    </section>
  );
}
