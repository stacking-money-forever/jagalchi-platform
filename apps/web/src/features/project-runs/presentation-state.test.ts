import { beforeEach, describe, expect, it } from 'vitest';

import {
  projectRunPresentationKey,
  projectRunTaskHref,
  readProjectRunPresentationState,
  replaceProjectRunTaskUrl,
  writeProjectRunPresentationState,
} from './presentation-state';

const defaults = {
  surface: 'map' as const,
  collapsedMilestones: [],
  selectedTaskId: 'task-default',
  search: '',
  statusFilter: 'ALL' as const,
};

describe('project run presentation state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState(null, '', '/projects/run-1');
  });

  it('isolates presentation state by run and plan revision', () => {
    const stored = { ...defaults, collapsedMilestones: ['m1'], search: '검증' };
    writeProjectRunPresentationState('run-1', 'plan-1:1', stored);

    expect(readProjectRunPresentationState('run-1', 'plan-1:1', defaults)).toEqual(stored);
    expect(readProjectRunPresentationState('run-1', 'plan-1:2', defaults)).toEqual(defaults);
    expect(
      window.localStorage.getItem(projectRunPresentationKey('run-1', 'plan-1:1')),
    ).toBeTruthy();
  });

  it('uses a task query as a stable deep-link override', () => {
    replaceProjectRunTaskUrl('task/2');
    expect(window.location.search).toBe('?task=task%2F2');
    expect(readProjectRunPresentationState('run-1', 'plan-1:1', defaults).selectedTaskId).toBe(
      'task/2',
    );
    expect(projectRunTaskHref('run-1', 'task/2')).toContain('?task=task%2F2#task-task%2F2');
  });
});
