'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import { publicationLabelKo, verificationLabelKo } from '../projection';

import type { ProjectRunProjection } from '@jagalchi/api-client';

export function ProjectRunProofView({ run }: { run: ProjectRunProjection }) {
  const commands = useProjectRunCommands(run);
  const proof = run.proof;
  const binding = run.repositoryBinding;
  const facts = proof?.facts;

  if (!proof) {
    return <p className="text-muted-foreground text-sm">Proof 데이터가 아직 없습니다.</p>;
  }

  return (
    <div className="space-y-6">
      <section aria-label="저장소 바인딩" className="border-border rounded-xl border p-4">
        <h2 className="text-sm font-bold">저장소 바인딩</h2>
        {binding ? (
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-bold">저장소</dt>
              <dd>{binding.repositoryName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-bold">PR</dt>
              <dd>#{binding.pullNumber ?? '—'}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground text-xs font-bold">HEAD SHA</dt>
              <dd className="font-mono text-xs break-all">{binding.headSha ?? '—'}</dd>
            </div>
            {binding.pullUrl ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs font-bold">Pull URL</dt>
                <dd>
                  <a
                    href={binding.pullUrl}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {binding.pullUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">바인딩 정보가 없습니다.</p>
        )}
      </section>

      <section aria-label="Proof 사실" className="border-border rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold">검증·발행 상태</h2>
          <Badge variant="subtle" intent="neutral">
            검증 {verificationLabelKo(proof.verification.state)}
          </Badge>
          <Badge variant="subtle" intent="neutral">
            발행 {publicationLabelKo(proof.publication.state)}
          </Badge>
          {proof.validUntil ? (
            <span className="text-muted-foreground text-xs">유효 기한 {proof.validUntil}</span>
          ) : null}
        </div>

        {facts ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs font-bold">스냅샷</dt>
              <dd className="font-mono text-xs">{facts.snapshotId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-bold">검증 수준</dt>
              <dd>{facts.verificationLevel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-bold">저장소</dt>
              <dd>{facts.repositoryName ?? facts.repositoryId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs font-bold">PR / SHA</dt>
              <dd>
                #{facts.pullNumber} · <span className="font-mono text-xs">{facts.headSha}</span>
              </dd>
            </div>
            {facts.taskKey ? (
              <div>
                <dt className="text-muted-foreground text-xs font-bold">작업 키</dt>
                <dd className="font-mono text-xs">{facts.taskKey}</dd>
              </div>
            ) : null}
            {facts.pullUrl ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground text-xs font-bold">Pull URL</dt>
                <dd>
                  <a
                    href={facts.pullUrl}
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {facts.pullUrl}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="text-muted-foreground mt-2 text-sm">기계 검증 사실이 아직 없습니다.</p>
        )}

        {facts?.evaluations?.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-border border-b">
                  <th className="p-2 font-bold">규칙</th>
                  <th className="p-2 font-bold">유형</th>
                  <th className="p-2 font-bold">결과</th>
                  <th className="p-2 font-bold">코드</th>
                </tr>
              </thead>
              <tbody>
                {facts.evaluations.map((ev) => (
                  <tr key={ev.ruleId} className="border-border border-b">
                    <td className="p-2 font-mono">{ev.ruleId}</td>
                    <td className="p-2">{ev.type}</td>
                    <td className="p-2">{ev.passed ? '통과' : '실패'}</td>
                    <td className="p-2 font-mono">{ev.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={commands.publish.isPending}
            onClick={() => commands.publish.mutate()}
          >
            발행
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={commands.unpublish.isPending}
            onClick={() => commands.unpublish.mutate()}
          >
            발행 취소
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={commands.reverify.isPending}
            onClick={() => commands.reverify.mutate()}
          >
            재검증
          </Button>
        </div>
      </section>

      <section aria-label="Proof 서술" className="border-border bg-muted/30 rounded-xl border p-4">
        <h2 className="text-sm font-bold">서술 (Narrative)</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-6 whitespace-pre-wrap">
          {proof.summary}
        </p>
      </section>
    </div>
  );
}
