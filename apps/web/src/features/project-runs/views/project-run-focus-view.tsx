'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { StatusChip } from '../components/roadmap/status-presentation';
import { useProjectRunCommands } from '../hooks/use-project-run-commands';

import type { RoadmapGraphModel } from '../projection';
import type { ProjectRunProjection } from '@jagalchi/api-client';

function taskById(model: RoadmapGraphModel, id: string | null) {
  if (!id) return null;
  return model.tasks.find((t) => t.id === id) ?? null;
}

export function ProjectRunFocusView({
  run,
  model,
}: {
  run: ProjectRunProjection;
  model: RoadmapGraphModel;
}) {
  const commands = useProjectRunCommands(run);
  const anchorId = run.currentTaskId ?? run.recommendedTaskId;
  const current = taskById(model, run.currentTaskId);
  const recommended = taskById(model, run.recommendedTaskId);
  const focusTask = taskById(model, anchorId);

  const citationsById = new Map((run.citations ?? []).map((c) => [c.id, c]));
  const gapsById = new Map((run.gaps ?? []).map((g) => [g.id, g]));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4" aria-label="포커스 작업">
        <header className="border-border bg-surface rounded-xl border p-4">
          <p className="text-muted-foreground text-xs font-bold">현재 작업 ID</p>
          <p className="mt-1 font-mono text-sm">{run.currentTaskId ?? '없음'}</p>
          <p className="text-muted-foreground mt-3 text-xs font-bold">추천 작업 ID</p>
          <p className="mt-1 font-mono text-sm">{run.recommendedTaskId ?? '없음'}</p>
        </header>

        {focusTask ? (
          <article className="border-border bg-surface-raised space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip state={focusTask.state} />
              <Badge variant="subtle" intent={focusTask.required ? 'neutral' : 'warning'}>
                {focusTask.required ? '필수' : '선택'}
              </Badge>
              {anchorId === run.currentTaskId ? (
                <Badge variant="subtle" intent="success">
                  현재 작업
                </Badge>
              ) : null}
              {anchorId === run.recommendedTaskId && anchorId !== run.currentTaskId ? (
                <Badge variant="subtle" intent="neutral">
                  추천 작업
                </Badge>
              ) : null}
            </div>
            <h2 className="text-lg font-bold">{focusTask.title}</h2>
            <p className="text-muted-foreground text-sm leading-6">{focusTask.purpose}</p>

            <section>
              <h3 className="text-sm font-bold">인용 (Citations)</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {(run.tasks.find((t) => t.id === focusTask.id)?.citationIds ?? []).map((id) => {
                  const citation = citationsById.get(id);
                  if (!citation) return null;
                  return (
                    <li key={id} className="border-border rounded-lg border p-3">
                      <p className="font-bold">{citation.label}</p>
                      {citation.quote ? (
                        <p className="text-muted-foreground mt-1 text-xs leading-5">
                          {citation.quote}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
                {(run.tasks.find((t) => t.id === focusTask.id)?.citationIds ?? []).length === 0 ? (
                  <li className="text-muted-foreground text-sm">연결된 인용이 없습니다.</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">갭 (Gaps)</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {(run.tasks.find((t) => t.id === focusTask.id)?.gapIds ?? []).map((id) => {
                  const gap = gapsById.get(id);
                  if (!gap) return null;
                  return (
                    <li key={id} className="border-border rounded-lg border p-3">
                      {gap.description}
                    </li>
                  );
                })}
                {(run.tasks.find((t) => t.id === focusTask.id)?.gapIds ?? []).length === 0 ? (
                  <li className="text-muted-foreground text-sm">연결된 갭이 없습니다.</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">증거 요구사항</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {focusTask.evidenceRequirements.map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">
                충족 평가 {focusTask.evidenceCount} / {focusTask.evidenceRequirements.length}
              </p>
            </section>

            {run.tasks.find((t) => t.id === focusTask.id)?.verificationFailure ? (
              <section className="border-warning bg-warning-subtle rounded-lg border p-3">
                <h3 className="text-sm font-bold">검증 실패</h3>
                <p className="mt-1 font-mono text-xs">
                  {run.tasks.find((t) => t.id === focusTask.id)?.verificationFailure?.code}
                </p>
                {run.tasks.find((t) => t.id === focusTask.id)?.verificationFailure?.note ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {run.tasks.find((t) => t.id === focusTask.id)?.verificationFailure?.note}
                  </p>
                ) : null}
              </section>
            ) : null}
          </article>
        ) : (
          <p className="text-muted-foreground text-sm">포커스할 작업이 아직 없습니다.</p>
        )}
      </section>

      <aside className="space-y-3" aria-label="작업 명령">
        <h3 className="text-sm font-bold">명령</h3>
        {focusTask ? (
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              disabled={commands.start.isPending}
              onClick={() => commands.start.mutate({ taskId: focusTask.id })}
            >
              시작
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={commands.defer.isPending}
              onClick={() => commands.defer.mutate({ taskId: focusTask.id })}
            >
              보류
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={commands.resume.isPending}
              onClick={() => commands.resume.mutate({ taskId: focusTask.id })}
            >
              재개
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={commands.verify.isPending}
              onClick={() => commands.verify.mutate({ taskId: focusTask.id })}
            >
              검증 요청
            </Button>
          </div>
        ) : null}
        <div className="text-muted-foreground space-y-1 text-xs">
          {current ? <p>현재: {current.title}</p> : null}
          {recommended && recommended.id !== current?.id ? <p>추천: {recommended.title}</p> : null}
        </div>
      </aside>
    </div>
  );
}
