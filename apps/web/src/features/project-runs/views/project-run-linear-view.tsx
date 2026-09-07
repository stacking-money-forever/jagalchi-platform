'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { StatusChip } from '../components/roadmap/status-presentation';
import { projectRunTaskHref } from '../presentation-state';

import type { RoadmapGraphModel, RoadmapTask } from '../projection';

function taskInPath(pathTaskIds: readonly string[], taskId: string): boolean {
  return pathTaskIds.includes(taskId);
}

function LinearTask({
  task,
  selected,
  onSelect,
  onOpenFocus,
  onPath,
  runId,
}: {
  task: RoadmapTask;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onOpenFocus: (taskId: string) => void;
  onPath: boolean;
  runId: string;
}) {
  return (
    <article
      id={`task-${task.id}`}
      className={cn(
        'border-border bg-surface-raised rounded-xl border p-3',
        selected && 'ring-ring ring-2',
        onPath && !selected && 'border-foreground/60',
      )}
    >
      <div className="flex flex-wrap items-start gap-2">
        <Button
          variant="ghost"
          className="h-auto min-w-0 flex-1 justify-start px-0 text-left font-bold whitespace-normal"
          aria-pressed={selected}
          aria-label={`작업 선택: ${task.title}`}
          onClick={() => onSelect(task.id)}
        >
          <span className="min-w-0">{task.title}</span>
        </Button>
        <StatusChip state={task.state} />
        <Badge variant="subtle" intent={task.required ? 'neutral' : 'warning'}>
          {task.required ? '필수' : '선택'}
        </Badge>
      </div>
      <p className="text-muted-foreground mt-2 text-sm leading-5">{task.outcome}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">
          증거 {task.evidenceCount} / {task.evidenceRequirements.length}
        </span>
        <a
          className="text-primary underline"
          href={projectRunTaskHref(runId, task.id)}
          aria-label={`작업 링크: ${task.title}`}
        >
          안정적인 작업 링크
        </a>
        <Button size="sm" variant="outline" onClick={() => onOpenFocus(task.id)}>
          포커스 열기
        </Button>
      </div>
    </article>
  );
}

export function ProjectRunLinearView({
  model,
  pathTaskIds,
  selectedTaskId,
  onTaskSelect,
  onOpenFocus,
}: {
  model: RoadmapGraphModel;
  pathTaskIds: string[];
  selectedTaskId: string | null;
  onTaskSelect: (taskId: string | null) => void;
  onOpenFocus: (taskId: string) => void;
}) {
  return (
    <section aria-label="선형 로드맵" className="mx-auto w-full max-w-3xl space-y-4">
      <header className="border-border bg-surface rounded-xl border p-4">
        <h2 className="text-lg font-bold">실행 로드맵 선형 보기</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          같은 Project Run projection을 작은 화면과 키보드 흐름에 맞게 순서대로 표시합니다.
        </p>
      </header>
      {model.milestones.map((milestone) => {
        const tasks = model.tasks.filter((task) => task.milestoneId === milestone.id);
        return (
          <section
            key={milestone.id}
            aria-labelledby={`linear-${milestone.id}`}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <h3 id={`linear-${milestone.id}`} className="text-sm font-bold">
                {milestone.title}
              </h3>
              <span className="text-muted-foreground text-xs">{tasks.length}개 작업</span>
            </div>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <LinearTask
                  key={task.id}
                  task={task}
                  selected={selectedTaskId === task.id}
                  onSelect={onTaskSelect}
                  onOpenFocus={onOpenFocus}
                  onPath={taskInPath(pathTaskIds, task.id)}
                  runId={model.runId}
                />
              ))
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                이 마일스톤에 작업이 없습니다.
              </p>
            )}
          </section>
        );
      })}
      {model.tasks.length === 0 ? (
        <p
          className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm"
          role="status"
        >
          표시할 작업이 없습니다.
        </p>
      ) : null}
    </section>
  );
}
