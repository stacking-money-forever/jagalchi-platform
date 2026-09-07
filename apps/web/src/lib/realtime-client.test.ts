import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Set<(payload: unknown) => void>>();
  const editBases: number[] = [];
  let editAttempt = 0;
  let conflictSequence = 2;
  let successSequence = 3;
  const socket = {
    connected: true,
    auth: {},
    on: vi.fn((event: string, callback: (payload: unknown) => void) => {
      const callbacks = listeners.get(event) ?? new Set();
      callbacks.add(callback);
      listeners.set(event, callbacks);
      return socket;
    }),
    off: vi.fn((event: string, callback: (payload: unknown) => void) => {
      listeners.get(event)?.delete(callback);
      return socket;
    }),
    emit: vi.fn((event: string, payload: unknown, callback?: (result: unknown) => void) => {
      if (event === 'roadmap:join') {
        callback?.({ ok: true, sequence: 1 });
      } else if (event === 'roadmap:edit') {
        editBases.push((payload as { baseSequence: number }).baseSequence);
        editAttempt += 1;
        callback?.(
          editAttempt === 1
            ? {
                ok: false,
                code: 'SEQUENCE_CONFLICT',
                message: 'stale',
                currentSequence: conflictSequence,
              }
            : { ok: true, sequence: successSequence },
        );
      }
      return socket;
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(() => listeners.clear()),
  };
  return {
    socket,
    io: vi.fn(() => socket),
    listeners,
    editBases,
    setEditSequences(conflict: number, success: number) {
      conflictSequence = conflict;
      successSequence = success;
    },
    reset() {
      listeners.clear();
      editBases.length = 0;
      editAttempt = 0;
      conflictSequence = 2;
      successSequence = 3;
      vi.clearAllMocks();
    },
  };
});

const api = vi.hoisted(() => ({
  issueRealtimeTicket: vi.fn(async () => ({
    ticket: 'a'.repeat(43),
    audience: 'roadmaps' as const,
    expiresAt: new Date(Date.now() + 30_000).toISOString(),
  })),
  getRoadmapDomainEvents: vi.fn(async (_id: string, _after: number) => ({
    events: [
      {
        id: 'event-2',
        sequence: '2',
        operation: { type: 'NODE_UPDATE', targetId: 'node-2' },
      },
    ],
    currentSequence: 2,
  })),
}));

vi.mock('socket.io-client', () => ({ io: mocks.io }));
vi.mock('@/api/roadmap-domain', () => api);

import {
  connectRealtime,
  disconnectRealtime,
  publishRoadmapAction,
  subscribeRealtime,
} from './realtime-client';

const roadmapId = '00000000-0000-4000-8000-000000000001';
const action = {
  actionId: 'action-1',
  action: 'EDIT',
  payload: { target: { type: 'NODE', object: 'node-1' } },
};

describe('realtime client sequence recovery', () => {
  beforeEach(async () => {
    disconnectRealtime();
    mocks.reset();
    api.getRoadmapDomainEvents.mockReset();
    api.getRoadmapDomainEvents.mockResolvedValue({
      events: [
        {
          id: 'event-2',
          sequence: '2',
          operation: { type: 'NODE_UPDATE', targetId: 'node-2' },
        },
      ],
      currentSequence: 2,
    });
    await connectRealtime({ roadmapId });
  });

  it('uses a one-time ticket issued through the same-origin API', () => {
    expect(api.issueRealtimeTicket).toHaveBeenCalledTimes(1);
    expect(mocks.io).toHaveBeenCalledWith(
      expect.stringContaining('/roadmaps'),
      expect.objectContaining({ auth: { ticket: 'a'.repeat(43) }, reconnection: false }),
    );
  });

  it('replays missing events before retrying the same idempotent edit', async () => {
    const replayed: unknown[] = [];
    const subscription = subscribeRealtime('roadmap:event', (payload) => replayed.push(payload));

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: true,
      sequence: 3,
    });

    expect(api.getRoadmapDomainEvents).toHaveBeenCalledWith(roadmapId, 1);
    expect(replayed).toEqual([
      expect.objectContaining({
        roadmapId,
        eventId: 'event-2',
        sequence: 2,
        replayed: true,
      }),
    ]);
    expect(mocks.editBases).toEqual([1, 2]);
    subscription?.unsubscribe();
  });

  it('accepts an empty backlog only when the authoritative cursor already matches', async () => {
    mocks.setEditSequences(1, 2);
    api.getRoadmapDomainEvents.mockResolvedValueOnce({
      events: [],
      currentSequence: 1,
    });

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: true,
      sequence: 2,
    });

    expect(api.getRoadmapDomainEvents).toHaveBeenCalledWith(roadmapId, 1);
    expect(mocks.editBases).toEqual([1, 1]);
  });

  it('replays an exactly-limit page through its authoritative cursor', async () => {
    const events = Array.from({ length: 500 }, (_, index) => ({
      id: `event-${index + 2}`,
      sequence: String(index + 2),
      operation: { type: 'NODE_UPDATE', targetId: `node-${index + 2}` },
    }));
    mocks.setEditSequences(501, 502);
    api.getRoadmapDomainEvents.mockResolvedValueOnce({
      events,
      currentSequence: 501,
    });

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: true,
      sequence: 502,
    });

    expect(api.getRoadmapDomainEvents).toHaveBeenCalledTimes(1);
    expect(mocks.editBases).toEqual([1, 501]);
  });

  it('replays every page of a conceptual 500-plus-event backlog', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `event-${index + 2}`,
      sequence: String(index + 2),
      operation: { type: 'NODE_UPDATE', targetId: `node-${index + 2}` },
    }));
    const replayed: number[] = [];
    const subscription = subscribeRealtime('roadmap:event', (payload) => {
      replayed.push((payload as { sequence: number }).sequence);
    });
    mocks.setEditSequences(502, 503);
    api.getRoadmapDomainEvents.mockImplementation(async (_id: string, after: number) => {
      if (after === 1) {
        return { events: firstPage, currentSequence: 502 };
      }
      if (after === 501) {
        return {
          events: [
            {
              id: 'event-502',
              sequence: '502',
              operation: { type: 'NODE_UPDATE', targetId: 'node-502' },
            },
          ],
          currentSequence: 502,
        };
      }
      throw new Error(`unexpected cursor ${after}`);
    });

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: true,
      sequence: 503,
    });

    expect(api.getRoadmapDomainEvents).toHaveBeenNthCalledWith(1, roadmapId, 1);
    expect(api.getRoadmapDomainEvents).toHaveBeenNthCalledWith(2, roadmapId, 501);
    expect(mocks.editBases).toEqual([1, 502]);
    expect(replayed).toHaveLength(501);
    expect(replayed.at(0)).toBe(2);
    expect(replayed.at(-1)).toBe(502);
    subscription?.unsubscribe();
  });

  it.each([
    ['missing', { events: [], currentSequence: 2 }],
    [
      'non-advancing',
      {
        events: [
          {
            id: 'event-1',
            sequence: '1',
            operation: { type: 'NODE_UPDATE', targetId: 'node-1' },
          },
        ],
        currentSequence: 2,
      },
    ],
    ['invalid', { events: [], currentSequence: Number.NaN }],
  ])('fails explicitly for a %s replay page', async (_kind, page) => {
    api.getRoadmapDomainEvents.mockResolvedValueOnce(page);

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: false,
      code: 'REPLAY_FAILED',
    });

    expect(mocks.editBases).toEqual([1]);
  });

  it('bounds replay attempts when an authoritative cursor remains out of reach', async () => {
    api.getRoadmapDomainEvents.mockImplementation(async (_id: string, after: number) => ({
      events: [
        {
          id: `event-${after + 1}`,
          sequence: String(after + 1),
          operation: { type: 'NODE_UPDATE', targetId: `node-${after + 1}` },
        },
      ],
      currentSequence: 102,
    }));

    await expect(publishRoadmapAction(roadmapId, action)).resolves.toMatchObject({
      ok: false,
      code: 'REPLAY_FAILED',
    });

    expect(api.getRoadmapDomainEvents).toHaveBeenCalledTimes(100);
    expect(mocks.editBases).toEqual([1]);
  });

  it('uses the sequence from incoming room events for the next edit', async () => {
    const subscription = subscribeRealtime('roadmap:event', () => undefined);
    for (const callback of mocks.listeners.get('roadmap:event') ?? []) {
      callback({
        roadmapId,
        eventId: 'event-4',
        sequence: 4,
        operation: { type: 'NODE_UPDATE', targetId: 'node-2' },
      });
    }
    mocks.socket.emit.mockImplementationOnce(
      (_event: string, payload: unknown, callback?: (result: unknown) => void) => {
        mocks.editBases.push((payload as { baseSequence: number }).baseSequence);
        callback?.({ ok: true, sequence: 5 });
        return mocks.socket;
      },
    );

    await publishRoadmapAction(roadmapId, action);
    expect(mocks.editBases).toEqual([4]);
    subscription?.unsubscribe();
  });
});
