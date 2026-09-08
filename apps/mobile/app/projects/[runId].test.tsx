import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ runId: 'run-1' }) }));
jest.mock('../../src/auth/session-store', () => ({
  getNativeAccessToken: jest.fn(async () => 'native-access-token'),
}));
jest.mock('../../src/auth/native-api', () => ({
  nativeRefresh: jest.fn(),
}));

import ProjectRunScreen from './[runId]';

describe('ProjectRunScreen', () => {
  it('renders the canonical projection after an authenticated native request', async () => {
    globalThis.fetch = jest.fn(async () =>
      Response.json({
        id: 'run-1',
        state: 'ACTIVE',
        version: 1,
        currentTaskId: 'task-1',
        recommendedTaskId: 'task-1',
        plan: { id: 'plan-1', schemaVersion: 1 },
        map: {
          nodes: [{ id: 'task-1', title: 'API 구현', milestoneId: null, state: 'IN_PROGRESS' }],
          edges: [],
        },
        tasks: [{
          id: 'task-1', title: 'API 구현', state: 'IN_PROGRESS', required: true,
          milestoneId: null, prerequisiteIds: [], purpose: 'API 구현',
          acceptanceCriteria: ['test'], evidenceRequirements: ['PR'],
        }],
        proof: null,
      }),
    ) as jest.Mock;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
    });
    const view = render(
      <QueryClientProvider client={queryClient}>
        <ProjectRunScreen />
      </QueryClientProvider>,
    );
    try {
      expect((await screen.findAllByText('API 구현', {}, { timeout: 5_000 })).length).toBeGreaterThan(
        0,
      );
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/project-runs/run-1'),
        expect.objectContaining({ method: 'GET' }),
      );
    } finally {
      view.unmount();
      queryClient.clear();
    }
  });
});
