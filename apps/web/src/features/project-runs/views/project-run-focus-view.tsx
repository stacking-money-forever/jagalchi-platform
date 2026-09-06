'use client';

import { useState } from 'react';

import { ApiResponseError, type ProjectRunProjection } from '@jagalchi/api-client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { StatusChip } from '../components/roadmap/status-presentation';
import { useProjectRunCommands } from '../hooks/use-project-run-commands';
import { evidenceRequirementLabelKo, readCareerTarget } from '../projection';

import type { RoadmapGraphModel, RoadmapTask } from '../projection';

function taskById(model: RoadmapGraphModel, id: string | null | undefined) {
  if (!id) return null;
  return model.tasks.find((task) => task.id === id) ?? null;
}

function prerequisiteTitles(model: RoadmapGraphModel, taskId: string): string[] {
  const task = model.tasks.find((candidate) => candidate.id === taskId);
  if (!task) return [];
  return task.prerequisiteIds
    .map((id) => model.tasks.find((candidate) => candidate.id === id)?.title)
    .filter((title): title is string => Boolean(title));
}

function eligibleReadyTasks(model: RoadmapGraphModel): RoadmapTask[] {
  const byId = new Map(model.tasks.map((task) => [task.id, task]));
  return model.tasks.filter(
    (task) =>
      task.state === 'READY' && task.prerequisiteIds.every((id) => byId.get(id)?.state === 'DONE'),
  );
}

function nextTransition(task: RoadmapTask): string {
  if (task.state === 'READY') return '시작';
  if (task.state === 'IN_PROGRESS') return '보류 또는 검증 요청';
  if (task.state === 'DEFERRED') return '재개';
  if (task.state === 'VERIFYING') return '검증 결과 대기';
  if (task.state === 'BLOCKED') return '차단 사유 해소 후 재개';
  if (task.state === 'DONE') return '다음 권장 작업으로 이동';
  return '선행 작업 완료 대기';
}

function commandErrorCopy(error: unknown): string {
  if (error instanceof ApiResponseError) {
    if (error.status === 409 || error.code === 'STALE_PROJECTION') {
      return '화면의 실행 버전이 오래되었습니다. 새 projection을 다시 받아 재시도하세요.';
    }
    return `${error.code ?? 'COMMAND_FAILED'}: ${error.message}`;
  }
  return error instanceof Error ? error.message : '명령을 실행하지 못했습니다.';
}

export function ProjectRunFocusView({
  run,
  model,
  selectedTaskId,
  onTaskSelect,
}: {
  run: ProjectRunProjection;
  model: RoadmapGraphModel;
  selectedTaskId?: string | null;
  onTaskSelect?: (taskId: string | null) => void;
}) {
  const commands = useProjectRunCommands(run);
  const [blockNote, setBlockNote] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const current = taskById(model, run.currentTaskId);
  const recommended = taskById(model, run.recommendedTaskId);
  const selected = taskById(model, selectedTaskId);
  const focusTask = selected ?? current ?? recommended;
  const careerTarget = readCareerTarget(run.target);
  const selectTask = onTaskSelect ?? (() => undefined);
  const block = commands.block ?? { isPending: false, mutate: () => undefined, error: null };
  const aiHelp = commands.aiHelp ?? {
    isPending: false,
    mutate: () => undefined,
    error: null,
    data: undefined,
  };
  const errors = [
    commands.start.error,
    commands.defer.error,
    block.error,
    commands.resume.error,
    commands.verify.error,
    aiHelp.error,
  ];
  const commandError = errors.find(Boolean);
  const citationsById = new Map((run.citations ?? []).map((citation) => [citation.id, citation]));
  const gapsById = new Map((run.gaps ?? []).map((gap) => [gap.id, gap]));
  const focusTaskRow = run.tasks.find((task) => task.id === focusTask?.id);
  const eligibleTasks = eligibleReadyTasks(model);
  const activeTaskSelected = Boolean(focusTask && focusTask.id === run.currentTaskId);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section role="region" aria-label="포커스 작업" className="min-w-0 space-y-4">
        <header className="border-border bg-surface rounded-xl border p-4">
          {careerTarget ? (
            <p className="text-muted-foreground text-xs font-bold">목표 포지션</p>
          ) : null}
          {careerTarget ? (
            <p className="mt-1 text-sm font-bold">
              {[careerTarget.company, careerTarget.role].filter(Boolean).join(' · ')}
            </p>
          ) : null}
          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground font-bold">현재 작업</dt>
              <dd className="mt-1 font-mono break-all">{run.currentTaskId ?? '없음'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-bold">다음 권장 작업</dt>
              <dd className="mt-1 font-mono break-all">{run.recommendedTaskId ?? '없음'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground font-bold">projection 버전</dt>
              <dd className="mt-1 font-mono">{run.version}</dd>
            </div>
          </dl>
          {run.pendingOperation ? (
            <p className="text-muted-foreground mt-3 text-xs break-all" role="status">
              진행 중인 작업: <span className="font-mono">{run.pendingOperation.id}</span>
            </p>
          ) : null}
          {run.plan.provenance ? (
            <p className="text-muted-foreground mt-3 text-xs break-all">
              계획 provenance: {run.plan.provenance.compileReceipt?.provider ?? '미제공'} ·{' '}
              {run.plan.provenance.compileReceipt?.model ?? '모델 미제공'} ·{' '}
              {run.plan.provenance.compileReceipt?.promptVersion ?? '프롬프트 버전 미제공'}
            </p>
          ) : null}
        </header>

        {eligibleTasks.length > 0 ? (
          <section
            className="border-border bg-surface rounded-xl border p-4"
            aria-label="시작 가능한 작업"
          >
            <h3 className="text-sm font-bold">다른 시작 가능한 작업</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {eligibleTasks.map((task) => (
                <Button
                  key={task.id}
                  size="sm"
                  variant={task.id === focusTask?.id ? 'solid' : 'outline'}
                  aria-pressed={task.id === focusTask?.id}
                  onClick={() => selectTask(task.id)}
                >
                  {task.title}
                </Button>
              ))}
            </div>
          </section>
        ) : null}

        {focusTask ? (
          <article
            id={`task-${focusTask.id}`}
            className="border-border bg-surface-raised min-w-0 space-y-4 rounded-xl border p-4"
          >
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

            <section>
              <h3 className="text-sm font-bold">인용된 채용 요구사항</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {(focusTaskRow?.citationIds ?? []).map((id) => {
                  const citation = citationsById.get(id);
                  if (!citation) return null;
                  return (
                    <li key={id} className="border-border min-w-0 rounded-lg border p-3">
                      <p className="font-bold">{citation.label}</p>
                      {citation.quote ? (
                        <p className="text-muted-foreground mt-1 text-xs leading-5 break-all">
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
                    <li key={id} className="border-border rounded-lg border p-3 break-all">
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
                {focusTask.evidenceRequirements.map((requirement) => (
                  <li key={requirement}>{evidenceRequirementLabelKo(requirement)}</li>
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

      <aside className="min-w-0 space-y-3" aria-label="작업 명령">
        <h3 className="text-sm font-bold">명령</h3>
        {commandError ? (
          <p
            role="alert"
            className="border-destructive bg-destructive/10 text-destructive rounded-lg border p-3 text-xs"
          >
            {commandErrorCopy(commandError)}
          </p>
        ) : null}
        {focusTask ? (
          <div className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs">
              다음 전이: <span className="font-bold">{nextTransition(focusTask)}</span>
            </p>
            <Button
              size="sm"
              disabled={commands.start.isPending || focusTask.state !== 'READY'}
              onClick={() => commands.start.mutate({ taskId: focusTask.id })}
            >
              시작
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                commands.defer.isPending || !['READY', 'IN_PROGRESS'].includes(focusTask.state)
              }
              onClick={() => commands.defer.mutate({ taskId: focusTask.id })}
            >
              보류
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={
                commands.resume.isPending || !['DEFERRED', 'BLOCKED'].includes(focusTask.state)
              }
              onClick={() => commands.resume.mutate({ taskId: focusTask.id })}
            >
              재개
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={block.isPending || !['READY', 'IN_PROGRESS'].includes(focusTask.state)}
              onClick={() =>
                block.mutate({
                  taskId: focusTask.id,
                  reasonCode: 'USER_REQUESTED',
                  note: blockNote.trim() || undefined,
                })
              }
            >
              막힘 기록
            </Button>
            <Input
              value={blockNote}
              onChange={(event) => setBlockNote(event.target.value)}
              aria-label="막힘 기록 메모"
              placeholder="막힘 사유 메모 (선택)"
              className="h-9 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={commands.verify.isPending || focusTask.state !== 'IN_PROGRESS'}
              onClick={() => commands.verify.mutate({ taskId: focusTask.id })}
            >
              검증 요청
            </Button>
            {activeTaskSelected ? (
              <section className="border-border rounded-lg border p-3">
                <h4 className="text-sm font-bold">현재 작업 AI 도움</h4>
                <Input
                  value={aiQuestion}
                  onChange={(event) => setAiQuestion(event.target.value)}
                  aria-label="현재 작업 AI 질문"
                  placeholder="완료 기준을 질문하세요"
                  className="mt-2 h-9 text-xs"
                />
                <Button
                  className="mt-2 w-full"
                  size="sm"
                  variant="outline"
                  disabled={aiHelp.isPending}
                  onClick={() =>
                    aiHelp.mutate({
                      taskId: focusTask.id,
                      question: aiQuestion.trim() || undefined,
                    })
                  }
                >
                  {aiHelp.isPending ? '도움 생성 중' : 'AI 도움 요청'}
                </Button>
                {aiHelp.data ? (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="leading-5">{aiHelp.data.guidance}</p>
                    <p className="text-muted-foreground break-all">
                      provenance: {JSON.stringify(aiHelp.data.provenance)}
                    </p>
                  </div>
                ) : null}
              </section>
            ) : (
              <p className="text-muted-foreground text-xs">
                AI 도움은 현재 작업에서만 요청할 수 있습니다.
              </p>
            )}
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
