'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { StatusChip } from '../components/roadmap/status-presentation';
import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import { evidenceRequirementLabelKo } from '../projection';

import type { RoadmapGraphModel } from '../projection';
import type { ProjectRunProjectionEnvelope } from '../projection/projection-contract';

function taskById(model: RoadmapGraphModel, id: string | null) {
  if (!id) return null;
  return model.tasks.find((t) => t.id === id) ?? null;
}

function prerequisiteTitles(model: RoadmapGraphModel, taskId: string): string[] {
  const task = model.tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return task.prerequisiteIds
    .map((id) => model.tasks.find((t) => t.id === id)?.title)
    .filter((title): title is string => Boolean(title));
}

export function ProjectRunFocusView({
  run,
  model,
}: {
  run: ProjectRunProjectionEnvelope;
  model: RoadmapGraphModel;
}) {
  const commands = useProjectRunCommands(run);
  const current = taskById(model, run.currentTaskId);
  const recommended = taskById(model, run.recommendedTaskId);
  const focusTask = current ?? recommended;

  const citationsById = new Map((run.citations ?? []).map((c) => [c.id, c]));
  const gapsById = new Map((run.gaps ?? []).map((g) => [g.id, g]));
  const focusTaskRow = run.tasks.find((t) => t.id === focusTask?.id);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4" aria-label="포커스 작업">
        <header className="border-border bg-surface rounded-xl border p-4">
          {run.target?.company || run.target?.role ? (
            <p className="text-muted-foreground text-xs font-bold">목표 포지션</p>
          ) : null}
          {run.target?.company || run.target?.role ? (
            <p className="mt-1 text-sm font-bold">
              {[run.target.company, run.target.role].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <p className="text-muted-foreground mt-3 text-xs font-bold">현재 작업</p>
          <p className="mt-1 font-mono text-sm">{run.currentTaskId ?? '없음'}</p>
          <p className="text-muted-foreground mt-3 text-xs font-bold">다음 권장 작업</p>
          <p className="mt-1 font-mono text-sm">{run.recommendedTaskId ?? '없음'}</p>
        </header>

        {focusTask ? (
          <article className="border-border bg-surface-raised space-y-4 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusChip state={focusTask.state} />
              <Badge variant="subtle" intent={focusTask.required ? 'neutral' : 'warning'}>
                {focusTask.required ? '필수' : '선택'}
              </Badge>
              {current?.id === focusTask.id ? (
                <Badge variant="subtle" intent="success">
                  현재 작업
                </Badge>
              ) : null}
              {recommended?.id === focusTask.id && recommended.id !== current?.id ? (
                <Badge variant="subtle" intent="neutral">
                  다음 권장 작업
                </Badge>
              ) : null}
            </div>
            <h2 className="text-lg font-bold">{focusTask.title}</h2>
            <p className="text-muted-foreground text-sm leading-6">{focusTask.purpose}</p>

            {recommended && recommended.id !== current?.id ? (
              <p className="text-muted-foreground text-xs">
                다음 권장 작업: <span className="font-bold">{recommended.title}</span>
              </p>
            ) : null}

            <section>
              <h3 className="text-sm font-bold">인용된 채용 요구사항</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {(focusTaskRow?.citationIds ?? []).map((id) => {
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
                {(focusTaskRow?.citationIds ?? []).length === 0 ? (
                  <li className="text-muted-foreground text-sm">연결된 인용이 없습니다.</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">커리어 갭</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {(focusTaskRow?.gapIds ?? []).map((id) => {
                  const gap = gapsById.get(id);
                  if (!gap) return null;
                  return (
                    <li key={id} className="border-border rounded-lg border p-3">
                      {gap.description}
                    </li>
                  );
                })}
                {(focusTaskRow?.gapIds ?? []).length === 0 ? (
                  <li className="text-muted-foreground text-sm">연결된 갭이 없습니다.</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">선행 조건</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {prerequisiteTitles(model, focusTask.id).map((title) => (
                  <li key={title}>{title}</li>
                ))}
                {prerequisiteTitles(model, focusTask.id).length === 0 ? (
                  <li className="text-muted-foreground list-none pl-0">선행 작업 없음</li>
                ) : null}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">완료 기준</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {focusTask.acceptanceCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-bold">증거 요건</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {focusTask.evidenceRequirements.map((req) => (
                  <li key={req}>{evidenceRequirementLabelKo(req)}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2 text-xs">
                충족 평가 {focusTask.evidenceCount} / {focusTask.evidenceRequirements.length}
              </p>
            </section>

            {focusTaskRow?.verificationFailure ? (
              <section className="border-warning bg-warning-subtle rounded-lg border p-3">
                <h3 className="text-sm font-bold">검증 실패</h3>
                <p className="mt-1 font-mono text-xs">{focusTaskRow.verificationFailure.code}</p>
                {focusTaskRow.verificationFailure.note ? (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {focusTaskRow.verificationFailure.note}
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
          {recommended && recommended.id !== current?.id ? (
            <p>다음 권장: {recommended.title}</p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
