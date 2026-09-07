'use client';

import { cn } from '@/lib/utils';

import { STATE_LABEL_KO, type RoadmapGraphModel, type RoadmapTask } from '../../projection';

type JourneyListProps = {
  model: RoadmapGraphModel;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  currentTaskId: string | null;
};

type JourneyStage = {
  title: string;
  tasks: RoadmapTask[];
};

function journeyStages(model: RoadmapGraphModel): JourneyStage[] {
  const tasksByMilestone = new Map<string, RoadmapTask[]>();
  for (const task of model.tasks) {
    if (!task.milestoneId) continue;
    const tasks = tasksByMilestone.get(task.milestoneId) ?? [];
    tasks.push(task);
    tasksByMilestone.set(task.milestoneId, tasks);
  }

  const stages = model.milestones.map((milestone) => ({
    title: milestone.title,
    tasks: tasksByMilestone.get(milestone.id) ?? [],
  }));
  const knownMilestoneIds = new Set(model.milestones.map((milestone) => milestone.id));
  const ungroupedTasks = model.tasks.filter(
    (task) => !task.milestoneId || !knownMilestoneIds.has(task.milestoneId),
  );

  if (ungroupedTasks.length > 0) {
    stages.push({ title: '단계 미지정 작업', tasks: ungroupedTasks });
  }

  return stages;
}

function prerequisiteSummary(task: RoadmapTask, tasksById: Map<string, RoadmapTask>): string {
  const titles = task.prerequisiteIds
    .map((taskId) => tasksById.get(taskId)?.title)
    .filter((title): title is string => Boolean(title));

  if (task.state === 'LOCKED') {
    return titles.length > 0
      ? `선행 작업 완료 대기: ${titles.join(', ')}`
      : '선행 작업 완료를 기다리고 있습니다.';
  }

  if (task.state === 'BLOCKED') {
    return task.blockedReason ? `막힌 이유: ${task.blockedReason}` : '막힌 이유를 확인해야 합니다.';
  }

  if (task.state === 'READY') return '지금 시작할 수 있습니다.';
  if (task.state === 'DONE') return '완료된 작업입니다.';
  return titles.length > 0 ? `선행 작업: ${titles.join(', ')}` : '선행 작업 없음';
}

function taskKindSummary(task: RoadmapTask, isCurrent: boolean): string {
  const labels = [isCurrent ? '현재 작업' : null, task.required ? '필수 작업' : '선택 작업'].filter(
    (label): label is string => Boolean(label),
  );
  return labels.join(' · ');
}

/**
 * 캔버스와 같은 선택 상태를 쓰는, 키보드와 작은 화면용 선형 여정입니다.
 * 선택 외의 명령이나 서버 상태 변경은 여기서 수행하지 않습니다.
 */
export function JourneyList({
  model,
  selectedTaskId,
  onSelectTask,
  currentTaskId,
}: JourneyListProps) {
  const tasksById = new Map(model.tasks.map((task) => [task.id, task]));
  const stages = journeyStages(model);

  return (
    <section aria-labelledby="journey-list-title" className="min-w-0 space-y-5">
      <header>
        <h2 id="journey-list-title" className="text-base font-bold">
          작업 여정
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          작업을 선택하면 본문에서 내용을 확인할 수 있습니다.
        </p>
      </header>

      {model.tasks.length === 0 ? (
        <p
          className="text-muted-foreground border-border rounded-xl border border-dashed p-4 text-sm"
          role="status"
        >
          아직 표시할 작업이 없습니다.
        </p>
      ) : (
        stages.map((stage, stageIndex) => (
          <section
            key={`${stage.title}-${stageIndex}`}
            aria-labelledby={`journey-stage-${stageIndex}`}
          >
            <h3
              id={`journey-stage-${stageIndex}`}
              className="text-muted-foreground text-sm font-bold"
            >
              {stage.title}
            </h3>
            {stage.tasks.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm">이 단계에 작업이 없습니다.</p>
            ) : (
              <ol className="mt-2 space-y-2">
                {stage.tasks.map((task) => {
                  const isCurrent = task.id === currentTaskId;
                  const isSelected = task.id === selectedTaskId;
                  const kindSummary = taskKindSummary(task, isCurrent);
                  const stateLabel = STATE_LABEL_KO[task.state];

                  return (
                    <li
                      key={task.id}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={cn(
                        'border-border bg-surface-raised rounded-xl border p-3',
                        isSelected && 'ring-ring ring-offset-surface ring-2 ring-offset-2',
                      )}
                    >
                      <button
                        type="button"
                        className="hover:bg-accent focus-visible:ring-ring focus-visible:ring-offset-surface flex min-h-11 w-full items-start justify-between gap-3 rounded-lg px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                        aria-label={`작업 선택: ${task.title}, ${kindSummary}, 상태 ${stateLabel}`}
                        aria-pressed={isSelected}
                        onClick={() => onSelectTask(task.id)}
                      >
                        <span className="min-w-0 font-bold break-words">{task.title}</span>
                        <span
                          className="text-muted-foreground shrink-0 text-sm"
                          aria-label={`상태: ${stateLabel}`}
                        >
                          {stateLabel}
                        </span>
                      </button>
                      <p className="text-muted-foreground mt-2 text-sm">{kindSummary}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-5">
                        {prerequisiteSummary(task, tasksById)}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        ))
      )}
    </section>
  );
}
