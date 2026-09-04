import { ApiResponseError } from '@jagalchi/api-client';

export type EntryBlockedReason =
  'FEATURE_DISABLED' | 'PROJECT_RUNS_DISABLED' | 'ENTITLEMENT_MISSING' | 'UNAUTHORIZED';

export interface OperationFailureView {
  title: string;
  message: string;
  code?: string;
  retryable: boolean;
}

const OPERATION_COPY: Record<
  string,
  Pick<OperationFailureView, 'title' | 'message' | 'retryable'>
> = {
  INSUFFICIENT_QUALIFIED_PROPOSALS: {
    title: '제안 3개를 만들지 못했습니다',
    message: '제약을 조정하거나 다시 생성해 주세요.',
    retryable: false,
  },
  AI_CONTRACT_INVALID: {
    title: '계약 검증에 실패했습니다',
    message: '입력 상태를 확인한 뒤 다시 시도해 주세요.',
    retryable: false,
  },
  EVIDENCE_RULE_UNSUPPORTED: {
    title: '지원하지 않는 증거 규칙',
    message: '다른 제안을 선택하거나 제약을 조정해 주세요.',
    retryable: false,
  },
  AI_SERVICE_UNAVAILABLE: {
    title: 'AI 서비스가 일시 중단됐습니다',
    message: '잠시 후 다시 시도해 주세요.',
    retryable: true,
  },
  AI_REQUEST_REJECTED: {
    title: 'AI 요청이 거절됐습니다',
    message: '입력을 확인한 뒤 다시 시도해 주세요.',
    retryable: true,
  },
  TARGET_FETCH_FAILED: {
    title: '공고를 가져오지 못했습니다',
    message: '수동 캡처로 전환하거나 URL을 확인해 주세요.',
    retryable: true,
  },
};

export function mapWorkflowOperationFailure(
  error: { code: string; retryable: boolean } | null | undefined,
): OperationFailureView {
  if (!error) {
    return {
      title: '작업이 실패했습니다',
      message: '다시 시도하거나 이전 단계로 돌아가 주세요.',
      retryable: true,
    };
  }
  const known = OPERATION_COPY[error.code];
  if (known) {
    return { ...known, code: error.code };
  }
  return {
    title: '작업이 실패했습니다',
    message: error.code,
    code: error.code,
    retryable: error.retryable,
  };
}

export function mapApiGateError(error: unknown): {
  blocked: EntryBlockedReason;
  title: string;
  message: string;
  code?: string;
} | null {
  if (!(error instanceof ApiResponseError)) return null;
  if (error.status === 401) {
    return {
      blocked: 'UNAUTHORIZED',
      title: '로그인이 필요합니다',
      message: '프로젝트 실행을 시작하려면 다시 로그인해 주세요.',
      code: error.code,
    };
  }
  if (error.status === 503 && error.code === 'PROJECT_RUNS_DISABLED') {
    return {
      blocked: 'PROJECT_RUNS_DISABLED',
      title: '프로젝트 실행이 비활성화됐습니다',
      message: '서버에서 프로젝트 실행 기능이 아직 열리지 않았습니다.',
      code: error.code,
    };
  }
  if (error.status === 404 && error.code?.includes('ENTITLEMENT')) {
    return {
      blocked: 'ENTITLEMENT_MISSING',
      title: '실행 권한이 없습니다',
      message: '이 계정에는 프로젝트 실행 자격이 아직 부여되지 않았습니다.',
      code: error.code,
    };
  }
  return null;
}

export function isManualCaptureSuggested(code?: string): boolean {
  return code === 'TARGET_FETCH_FAILED' || code === 'AI_EXTRACTION_GROUNDING_MISMATCH';
}
