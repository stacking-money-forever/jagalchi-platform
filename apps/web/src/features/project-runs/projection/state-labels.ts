import type { TaskState } from './types';

export const STATE_LABEL_KO: Record<TaskState, string> = {
  LOCKED: '잠김',
  READY: '시작 가능',
  IN_PROGRESS: '진행 중',
  BLOCKED: '막힘',
  DEFERRED: '보류',
  VERIFYING: '검증 중',
  DONE: '완료',
};

export function verificationLabelKo(state: 'PENDING' | 'PASS' | 'FAIL' | 'STALE'): string {
  switch (state) {
    case 'PENDING':
      return '대기';
    case 'PASS':
      return '통과';
    case 'FAIL':
      return '실패';
    case 'STALE':
      return '만료';
    default:
      return state;
  }
}

export function publicationLabelKo(state: 'ACTIVE' | 'UNPUBLISHED' | 'INVALIDATED'): string {
  switch (state) {
    case 'ACTIVE':
      return '발행됨';
    case 'UNPUBLISHED':
      return '미발행';
    case 'INVALIDATED':
      return '무효화';
    default:
      return state;
  }
}
