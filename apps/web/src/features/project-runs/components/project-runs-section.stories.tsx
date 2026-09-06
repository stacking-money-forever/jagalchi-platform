import type { Meta, StoryObj } from '@storybook/react';

import type { ProjectRunProjection } from '@jagalchi/api-client';

import { ProjectRunsSection } from './project-runs-section';

const baseRun: ProjectRunProjection = {
  id: '00000000-0000-4000-8000-000000000001',
  state: 'ACTIVE',
  version: 4,
  updatedAt: '2026-09-07T00:00:00Z',
  target: { company: '오픈마켓', role: '백엔드 개발자' },
  currentTaskId: 'task-api-contract',
  recommendedTaskId: null,
  plan: { id: 'plan-1', schemaVersion: 1 },
  map: { nodes: [], edges: [] },
  tasks: [
    {
      id: 'task-api-contract',
      title: 'API 계약과 회귀 테스트 고정',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: null,
      prerequisiteIds: [],
      purpose: '사용자 여정을 재현 가능한 계약으로 고정합니다.',
      acceptanceCriteria: ['계약 검사가 통과합니다.'],
      evidenceRequirements: ['계약 검사 결과'],
    },
  ],
  proof: null,
};

const runs: ProjectRunProjection[] = [
  baseRun,
  {
    ...baseRun,
    id: '00000000-0000-4000-8000-000000000002',
    state: 'BLOCKED',
    version: 2,
    updatedAt: '2026-09-06T00:00:00Z',
    target: { company: '핀테크랩', role: '프론트엔드 개발자' },
    currentTaskId: null,
    recommendedTaskId: 'task-proof',
    tasks: [
      {
        ...baseRun.tasks[0],
        id: 'task-proof',
        title: 'Proof 실패 원인 확인',
        state: 'READY',
      },
    ],
  },
  {
    ...baseRun,
    id: '00000000-0000-4000-8000-000000000003',
    state: 'COMPLETED',
    version: 8,
    updatedAt: '2026-09-03T00:00:00Z',
    target: { company: '커머스팀', role: '풀스택 개발자' },
    currentTaskId: null,
    recommendedTaskId: null,
    tasks: [],
  },
];

const meta = {
  title: 'Features/Project Runs/Closure Exemplar',
  component: ProjectRunsSection,
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <main className="bg-background text-foreground min-h-screen p-4 sm:p-6 lg:p-10">
        <div className="border-border bg-card mx-auto max-w-5xl rounded-2xl border px-4 py-6 sm:px-6 lg:px-10">
          <Story />
        </div>
      </main>
    ),
  ],
  args: { runs },
} satisfies Meta<typeof ProjectRunsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};
export const Loading: Story = { args: { runs: [], isLoading: true } };
export const Empty: Story = { args: { runs: [], canCreateProjectRun: true } };
export const Error: Story = { args: { runs: [], isError: true, onRetry: () => undefined } };
export const Pagination: Story = {
  args: { runs, hasNextPage: true, onLoadMore: () => undefined },
};
