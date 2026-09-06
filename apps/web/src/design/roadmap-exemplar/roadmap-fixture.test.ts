import { describe, expect, it } from 'vitest';

import { computeLayout, deriveCurrentPath, NODE_H, NODE_W } from './projection';
import { assertFixtureCoversStates, mainRunFixture, smallRunFixture } from './roadmap-fixture';

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return a.x < b.x + NODE_W && a.x + NODE_W > b.x && a.y < b.y + NODE_H && a.y + NODE_H > b.y;
}

describe('roadmap exemplar fixture contract', () => {
  it('covers the bounded 40x8x3 fixture and all required branches', () => {
    assertFixtureCoversStates();
    expect(mainRunFixture.tasks).toHaveLength(40);
    expect(mainRunFixture.milestones).toHaveLength(8);
    expect(mainRunFixture.tasks.every((task) => task.prerequisiteIds.length <= 3)).toBe(true);
    expect(smallRunFixture.milestones).toHaveLength(1);
    expect(smallRunFixture.tasks).toHaveLength(3);
    expect(
      mainRunFixture.tasks.filter((task) => task.state === 'READY' && task.milestoneId === 'm4'),
    ).toHaveLength(2);
    expect(mainRunFixture.tasks.some((task) => task.state === 'BLOCKED')).toBe(true);
    expect(mainRunFixture.tasks.some((task) => !task.required)).toBe(true);
    expect(
      mainRunFixture.tasks.some((task) =>
        task.prerequisiteIds.some((id) => {
          const parent = mainRunFixture.tasks.find((candidate) => candidate.id === id);
          return parent && parent.milestoneId !== task.milestoneId;
        }),
      ),
    ).toBe(true);
    expect(
      mainRunFixture.tasks.some((task) => /[가-힣]/u.test(task.title) && task.title.length > 20),
    ).toBe(true);
  });

  it('is deterministic, non-overlapping, labelled, and keeps blockers visible', () => {
    const path = deriveCurrentPath(mainRunFixture);
    const first = computeLayout(mainRunFixture, path, []);
    const second = computeLayout(mainRunFixture, path, []);
    expect(first.nodes.map((node) => [node.id, node.position])).toEqual(
      second.nodes.map((node) => [node.id, node.position]),
    );

    const tasks = first.nodes.filter((node) => node.type === 'task');
    for (let index = 0; index < tasks.length; index += 1) {
      for (let next = index + 1; next < tasks.length; next += 1) {
        expect(overlaps(tasks[index]!.position, tasks[next]!.position)).toBe(false);
      }
    }
    expect(first.nodes.every((node) => node.id.length > 0)).toBe(true);
    const blocked = mainRunFixture.tasks.find((task) => task.state === 'BLOCKED');
    expect(blocked).toBeTruthy();
    expect(first.nodes.some((node) => node.id === blocked!.id)).toBe(true);
    expect(first.edges.some((edge) => edge.target === 'proof')).toBe(true);
  });
});
