import { io, type Socket } from 'socket.io-client';

import { getRoadmapDomainEvents, issueRealtimeTicket } from '@/api/roadmap-domain';

export type RealtimeEvent = 'roadmap:event' | 'roadmap:cursor' | 'roadmap:cursor-hide';

export interface RealtimeSubscription {
  unsubscribe(): void;
}

interface RealtimeConnectOptions {
  roadmapId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface EditResponse {
  ok: boolean;
  sequence?: number;
  code?: string;
  message?: string;
  currentSequence?: number;
}

let socket: Socket | null = null;
let consumers = 0;
const sequences = new Map<string, number>();
const localSubscribers = new Map<RealtimeEvent, Set<(payload: unknown) => void>>();
const maxReplayPages = 100;

function realtimeOrigin(): string {
  const configured =
    process.env.NEXT_PUBLIC_REALTIME_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '/api';
  if (typeof window === 'undefined') return configured;
  return new URL(configured, window.location.origin).origin;
}

function getSocket(ticket: string): Socket {
  if (socket) {
    socket.auth = { ticket };
    return socket;
  }
  socket = io(`${realtimeOrigin()}/roadmaps`, {
    autoConnect: false,
    transports: ['websocket'],
    auth: { ticket },
    reconnection: false,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
  });
  return socket;
}

export async function connectRealtime(options: RealtimeConnectOptions): Promise<void> {
  let ticket: string;
  try {
    ({ ticket } = await issueRealtimeTicket());
  } catch (error) {
    options.onError?.(
      error instanceof Error ? error : new Error('실시간 연결 티켓을 발급하지 못했습니다.'),
    );
    return;
  }
  const current = getSocket(ticket);
  consumers += 1;
  const onConnect = () => {
    current.emit('roadmap:join', { roadmapId: options.roadmapId }, (result: EditResponse) => {
      if (!result.ok || typeof result.sequence !== 'number') {
        options.onError?.(new Error(result.message ?? '로드맵 연결이 거부되었습니다.'));
        return;
      }
      sequences.set(options.roadmapId, result.sequence);
      options.onConnect?.();
    });
  };
  const onDisconnect = () => options.onDisconnect?.();
  const onConnectError = (error: Error) => options.onError?.(error);
  current.on('connect', onConnect);
  current.on('disconnect', onDisconnect);
  current.on('connect_error', onConnectError);
  if (!current.connected) current.connect();
  else onConnect();
}

export function disconnectRealtime(): void {
  consumers = Math.max(0, consumers - 1);
  if (consumers > 0 || !socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  sequences.clear();
  localSubscribers.clear();
}

export function subscribeRealtime<T>(
  event: RealtimeEvent,
  callback: (payload: T) => void,
): RealtimeSubscription | null {
  if (!socket?.connected) return null;
  const wrapped = (payload: T) => {
    if (event === 'roadmap:event') {
      const value = payload as {
        roadmapId?: unknown;
        sequence?: unknown;
      };
      if (
        typeof value.roadmapId === 'string' &&
        typeof value.sequence === 'number' &&
        Number.isSafeInteger(value.sequence)
      ) {
        sequences.set(
          value.roadmapId,
          Math.max(sequences.get(value.roadmapId) ?? 0, value.sequence),
        );
      }
    }
    callback(payload);
  };
  const subscribers = localSubscribers.get(event) ?? new Set<(payload: unknown) => void>();
  subscribers.add(wrapped as (payload: unknown) => void);
  localSubscribers.set(event, subscribers);
  socket.on(event, wrapped);
  return {
    unsubscribe: () => {
      socket?.off(event, wrapped);
      subscribers.delete(wrapped as (payload: unknown) => void);
      if (subscribers.size === 0) localSubscribers.delete(event);
    },
  };
}

function deliverLocalEvent(event: RealtimeEvent, payload: unknown): void {
  for (const subscriber of localSubscribers.get(event) ?? []) {
    subscriber(payload);
  }
}

async function replayMissedEvents(roadmapId: string, after: number): Promise<number> {
  let cursor = after;
  for (let page = 0; page < maxReplayPages; page += 1) {
    const result = await getRoadmapDomainEvents(roadmapId, cursor);
    if (
      !Number.isSafeInteger(result.currentSequence) ||
      result.currentSequence < cursor ||
      !Array.isArray(result.events)
    ) {
      throw new Error('실시간 변경 내역 페이지가 유효하지 않습니다.');
    }
    const events = [...result.events].sort(
      (left, right) => Number(left.sequence) - Number(right.sequence),
    );
    for (const event of events) {
      const sequence = Number(event.sequence);
      if (!Number.isSafeInteger(sequence) || sequence !== cursor + 1) {
        throw new Error('실시간 변경 내역 페이지가 연속되지 않습니다.');
      }
      deliverLocalEvent('roadmap:event', {
        roadmapId,
        eventId: event.id,
        sequence,
        operation: event.operation,
        replayed: true,
      });
      cursor = sequence;
    }
    if (cursor === result.currentSequence) {
      sequences.set(roadmapId, cursor);
      return cursor;
    }
    if (events.length === 0 || cursor > result.currentSequence) {
      throw new Error('실시간 변경 내역을 모두 복구하지 못했습니다.');
    }
  }
  throw new Error('실시간 변경 내역을 모두 복구하지 못했습니다.');
}

function operationType(action: string, targetType: string): string {
  const suffix = action === 'CREATE' ? 'CREATE' : action === 'DELETE' ? 'DELETE' : 'UPDATE';
  return `${targetType}_${suffix}`;
}

export async function publishRoadmapAction(
  roadmapId: string,
  action: {
    actionId: string;
    action: string;
    payload: {
      target?: { type?: string; object?: string };
    } | null;
  },
): Promise<EditResponse> {
  const target = action.payload?.target;
  if (
    !socket?.connected ||
    !target ||
    typeof target.type !== 'string' ||
    typeof target.object !== 'string'
  ) {
    return {
      ok: false,
      code: 'INVALID_OPERATION',
      message: '전송할 편집 대상이 없습니다.',
    };
  }
  const targetType = target.type;
  const targetId = target.object;
  const emitEdit = (baseSequence: number) =>
    new Promise<EditResponse>((resolve) => {
      socket?.emit(
        'roadmap:edit',
        {
          roadmapId,
          idempotencyKey: action.actionId,
          baseSequence,
          operation: {
            type: operationType(action.action, targetType),
            targetId,
            value: { action: action.action, payload: action.payload },
          },
        },
        (response: EditResponse) => {
          if (typeof response.sequence === 'number') {
            sequences.set(roadmapId, response.sequence);
          }
          resolve(response);
        },
      );
    });
  let baseSequence = sequences.get(roadmapId) ?? 0;
  let response: EditResponse = {
    ok: false,
    code: 'SEQUENCE_CONFLICT',
    message: '실시간 변경 내역을 동기화하지 못했습니다.',
  };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await emitEdit(baseSequence);
    if (
      response.ok ||
      response.code !== 'SEQUENCE_CONFLICT' ||
      typeof response.currentSequence !== 'number'
    ) {
      return response;
    }
    try {
      await replayMissedEvents(roadmapId, baseSequence);
    } catch (error) {
      return {
        ok: false,
        code: 'REPLAY_FAILED',
        message: error instanceof Error ? error.message : '실시간 변경 내역을 복구하지 못했습니다.',
        currentSequence: response.currentSequence,
      };
    }
    baseSequence = sequences.get(roadmapId) ?? response.currentSequence;
  }
  return response;
}

export function publishCursor(roadmapId: string, position: { x: number; y: number }): void {
  socket?.emit('roadmap:cursor', { roadmapId, x: position.x, y: position.y });
}

export function publishCursorHide(roadmapId: string): void {
  socket?.emit('roadmap:cursor-hide', { roadmapId });
}
