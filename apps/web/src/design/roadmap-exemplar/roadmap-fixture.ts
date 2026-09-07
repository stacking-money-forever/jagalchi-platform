/**
 * Execution Roadmap Map exemplar fixture.
 *
 * Design-exemplar-only data. This is NOT the API contract type; it mirrors
 * ProjectRunProjectionDto (packages/api-client) so the approved exemplar maps
 * 1:1 onto the real projection in Phase 2.2 without inventing fields the API
 * does not supply.
 *
 * Covers every fixture required by docs/product/UI_REFERENCE_PACK.md:
 * - 8 milestones / 40 tasks / <=3 direct prerequisites per task
 * - parallel eligible READY tasks (M4: two READY tasks at once)
 * - a blocked path whose blocker sits outside the current viewport
 * - optional branches and cross-milestone dependencies
 * - long Korean task names and cited requirement labels
 * - every task status: LOCKED, READY, IN_PROGRESS, BLOCKED, DEFERRED, VERIFYING, DONE
 * - stale and invalidated Proof states (rendered in the Proof anchor node)
 * - 1 milestone / 3 tasks variant (see smallRunFixture)
 */

export type TaskState =
  'LOCKED' | 'READY' | 'IN_PROGRESS' | 'BLOCKED' | 'DEFERRED' | 'VERIFYING' | 'DONE';

export type Milestone = {
  id: string;
  title: string;
};

export type Task = {
  id: string;
  title: string;
  state: TaskState;
  required: boolean;
  milestoneId: string;
  prerequisiteIds: string[];
  /** 요구 역량 citation from the CareerTarget requirement. */
  requirementCitation: string;
  /** Career Diff gap this task closes. */
  gapCitation: string;
  purpose: string;
  acceptanceCriteria: string[];
  evidenceCount: number;
  /** Short outcome sentence shown at task zoom tier. */
  outcome: string;
  /** Block reason for BLOCKED tasks. */
  blockedReason?: string;
};

export type RoadmapFixture = {
  runId: string;
  runState: 'READY' | 'ACTIVE' | 'BLOCKED' | 'COMPLETED' | 'ARCHIVED';
  currentTaskId: string | null;
  recommendedTaskId: string | null;
  milestones: Milestone[];
  tasks: Task[];
  proof: {
    verification: 'PENDING' | 'PASS' | 'FAIL' | 'STALE';
    publication: 'ACTIVE' | 'UNPUBLISHED' | 'INVALIDATED';
  };
};

const M1: Milestone = { id: 'm1', title: '1. 요구사항 기반 프로젝트 골격' };
const M2: Milestone = { id: 'm2', title: '2. 백엔드 데이터 계약 구현' };
const M3: Milestone = { id: 'm3', title: '3. 핵심 도메인 로직' };
const M4: Milestone = { id: 'm4', title: '4. 인증과 권한 경계' };
const M5: Milestone = { id: 'm5', title: '5. 통합 검증 자동화' };
const M6: Milestone = { id: 'm6', title: '6. 배포 파이프라인' };
const M7: Milestone = { id: 'm7', title: '7. 관측 가능성과 운영 준비' };
const M8: Milestone = { id: 'm8', title: '8. Proof 발행과 마무리' };

export const mainRunFixture: RoadmapFixture = {
  runId: 'exemplar-run-8x40',
  runState: 'ACTIVE',
  currentTaskId: 't4-2',
  recommendedTaskId: 't4-2',
  milestones: [M1, M2, M3, M4, M5, M6, M7, M8],
  proof: {
    verification: 'PENDING',
    publication: 'UNPUBLISHED',
  },
  tasks: [
    // ---- M1: 5 tasks, all DONE ----
    {
      id: 't1-1',
      title: '저장소 초기화와 CI 골격 구성',
      state: 'DONE',
      required: true,
      milestoneId: M1.id,
      prerequisiteIds: [],
      requirementCitation: '요구사항: Git 협업 플로우 이해',
      gapCitation: '부족: PR 기반 협업 경험',
      purpose: 'PR 리뷰와 CI가 도는 저장소 기반을 만든다.',
      acceptanceCriteria: ['main 브랜치 보호 규칙 문서화', 'CI 워크플로 1개 이상'],
      evidenceCount: 2,
      outcome: 'PR + CI가 동작하는 저장소',
    },
    {
      id: 't1-2',
      title: '요구사항 문서화와 범위 정의',
      state: 'DONE',
      required: true,
      milestoneId: M1.id,
      prerequisiteIds: ['t1-1'],
      requirementCitation: '요구사항: 요구사항 분석 능력',
      gapCitation: '부족: 문서화된 요구사항 산출물',
      purpose: '무엇을 만들고 무엇을 만들지 않을지 문서로 남긴다.',
      acceptanceCriteria: ['범위/비범위 목록', '수용 기준 3개 이상'],
      evidenceCount: 3,
      outcome: '범위 문서 1부',
    },
    {
      id: 't1-3',
      title: '프로젝트 스캐폴딩 생성',
      state: 'DONE',
      required: true,
      milestoneId: M1.id,
      prerequisiteIds: ['t1-2'],
      requirementCitation: '요구사항: 프레임워크 초기 구성',
      gapCitation: '부족: 직접 구성한 앱 골격',
      purpose: '실행 가능한 앱 골격을 직접 구성한다. (생성 스캐폴딩은 증거가 아님)',
      acceptanceCriteria: ['로컬 실행 확인', '린트 통과'],
      evidenceCount: 2,
      outcome: '실행 가능한 앱 골격',
    },
    {
      id: 't1-4',
      title: '개발 환경 문서 작성',
      state: 'DONE',
      required: false,
      milestoneId: M1.id,
      prerequisiteIds: ['t1-3'],
      requirementCitation: '요구사항: 개발자 경험 배려',
      gapCitation: '부족: 온보딩 문서',
      purpose: '동료가 10분 안에 실행하게 만든다.',
      acceptanceCriteria: ['README 실행 가이드'],
      evidenceCount: 1,
      outcome: '온보딩 README',
    },
    {
      id: 't1-5',
      title: '디자인 토큰과 레이아웃 기초',
      state: 'DONE',
      required: true,
      milestoneId: M1.id,
      prerequisiteIds: ['t1-3'],
      requirementCitation: '요구사항: UI 구현 기초',
      gapCitation: '부족: 토큰 기반 스타일링',
      purpose: '의미 토큰으로 화면 기초를 잡는다.',
      acceptanceCriteria: ['색상/간격 토큰 정의', '기본 레이아웃 페이지'],
      evidenceCount: 2,
      outcome: '토큰 + 레이아웃',
    },

    // ---- M2: 6 tasks, 5 DONE + 1 DONE (long label test in DONE state) ----
    {
      id: 't2-1',
      title: '데이터 모델 스키마 정의',
      state: 'DONE',
      required: true,
      milestoneId: M2.id,
      prerequisiteIds: ['t1-2'],
      requirementCitation: '요구사항: 데이터 모델링',
      gapCitation: '부족: 스키마 설계 산출물',
      purpose: '도메인 모델을 스키마로 고정한다.',
      acceptanceCriteria: ['ERD 문서', '마이그레이션 파일'],
      evidenceCount: 2,
      outcome: '스키마 + 마이그레이션',
    },
    {
      id: 't2-2',
      title: 'API 엔드포인트 계약 정의',
      state: 'DONE',
      required: true,
      milestoneId: M2.id,
      prerequisiteIds: ['t2-1'],
      requirementCitation: '요구사항: API 설계',
      gapCitation: '부족: API 계약 문서',
      purpose: '요청/응답 계약을 먼저 고정한다.',
      acceptanceCriteria: ['OpenAPI 문서', '에러 응답 규격'],
      evidenceCount: 2,
      outcome: 'API 계약 문서',
    },
    {
      id: 't2-3',
      title: 'CRUD API 구현',
      state: 'DONE',
      required: true,
      milestoneId: M2.id,
      prerequisiteIds: ['t2-2'],
      requirementCitation: '요구사항: 백엔드 API 구현',
      gapCitation: '부족: 완성된 CRUD 구현',
      purpose: '계약대로 동작하는 CRUD를 만든다.',
      acceptanceCriteria: ['계약 테스트 통과', '검증/에러 처리'],
      evidenceCount: 4,
      outcome: '동작하는 CRUD API',
    },
    {
      id: 't2-4',
      title: '데이터 접근 계층과 트랜잭션 처리',
      state: 'DONE',
      required: true,
      milestoneId: M2.id,
      prerequisiteIds: ['t2-3'],
      requirementCitation: '요구사항: 데이터 일관성 관리',
      gapCitation: '부족: 트랜잭션 경험',
      purpose: '원자성이 필요한 흐름을 트랜잭션으로 묶는다.',
      acceptanceCriteria: ['트랜잭션 테스트', '롤백 시나리오'],
      evidenceCount: 2,
      outcome: '트랜잭션 계층',
    },
    {
      id: 't2-5',
      title: '긴 한글 라벨 표시 검증용 통합 테스트 시나리오 작성 태스크',
      state: 'DONE',
      required: true,
      milestoneId: M2.id,
      prerequisiteIds: ['t2-3'],
      requirementCitation: '요구사항: 통합 테스트 설계 능력과 시나리오 문서화',
      gapCitation: '부족: 통합 테스트 시나리오 산출물과 실행 증거',
      purpose: '라벨 오버플로 없이 긴 이름을 표시하는지 확인하는 fixture.',
      acceptanceCriteria: ['시나리오 문서', '실행 로그'],
      evidenceCount: 2,
      outcome: '통합 테스트 시나리오',
    },
    {
      id: 't2-6',
      title: '시드 데이터와 픽스처 준비',
      state: 'DONE',
      required: false,
      milestoneId: M2.id,
      prerequisiteIds: ['t2-1'],
      requirementCitation: '요구사항: 테스트 데이터 관리',
      gapCitation: '부족: 재현 가능한 데이터 준비',
      purpose: '로컬/테스트에서 같은 데이터를 쓰게 만든다.',
      acceptanceCriteria: ['시드 스크립트'],
      evidenceCount: 1,
      outcome: '시드 스크립트',
    },

    // ---- M3: 6 tasks, 4 DONE, 1 VERIFYING, 1 LOCKED ----
    {
      id: 't3-1',
      title: '도메인 규칙 모듈 분리',
      state: 'DONE',
      required: true,
      milestoneId: M3.id,
      prerequisiteIds: ['t2-4'],
      requirementCitation: '요구사항: 도메인 주도 설계',
      gapCitation: '부족: 도메인 계층 분리',
      purpose: '비즈니스 규칙을 프레임워크 바깥으로 뺀다.',
      acceptanceCriteria: ['순수 도메인 모듈', '단위 테스트'],
      evidenceCount: 3,
      outcome: '도메인 모듈',
    },
    {
      id: 't3-2',
      title: '상태 전이 규칙 구현',
      state: 'DONE',
      required: true,
      milestoneId: M3.id,
      prerequisiteIds: ['t3-1'],
      requirementCitation: '요구사항: 상태 머신 구현',
      gapCitation: '부족: 전이 규칙 구현 경험',
      purpose: '허용된 전이만 통과하는 가드를 만든다.',
      acceptanceCriteria: ['전이 테이블 테스트', '불법 전이 409'],
      evidenceCount: 5,
      outcome: '전이 가드',
    },
    {
      id: 't3-3',
      title: '검증 규칙 엔진 구현',
      state: 'VERIFYING',
      required: true,
      milestoneId: M3.id,
      prerequisiteIds: ['t3-2'],
      requirementCitation: '요구사항: 규칙 기반 검증 설계',
      gapCitation: '부족: 검증 엔진 구현',
      purpose: '증거 규칙을 평가해 통과/실패를 판정한다.',
      acceptanceCriteria: ['규칙 평가 테스트', '실패 사유 보고'],
      evidenceCount: 4,
      outcome: '검증 규칙 엔진',
    },
    {
      id: 't3-4',
      title: '도메인 예외와 오류 응답 정리',
      state: 'LOCKED',
      required: true,
      milestoneId: M3.id,
      prerequisiteIds: ['t3-3'],
      requirementCitation: '요구사항: 오류 처리 일관성',
      gapCitation: '부족: 일관된 오류 응답',
      purpose: '도메인 오류를 공통 응답으로 번역한다.',
      acceptanceCriteria: ['오류 매핑 테이블'],
      evidenceCount: 2,
      outcome: '오류 응답 규격',
    },

    // ---- M4: 6 tasks — the ACTIVE frontier with parallel READY + BLOCKED ----
    {
      id: 't4-1',
      title: '세션 기반 인증 흐름 구현',
      state: 'DONE',
      required: true,
      milestoneId: M4.id,
      prerequisiteIds: ['t3-1'],
      requirementCitation: '요구사항: 인증 흐름 구현',
      gapCitation: '부족: 세션 인증 구현',
      purpose: '로그인/로그아웃/갱신을 안전하게 만든다.',
      acceptanceCriteria: ['인증 테스트', '세션 만료 처리'],
      evidenceCount: 3,
      outcome: '세션 인증',
    },
    {
      id: 't4-2',
      title: '역할 기반 접근 제어 적용',
      state: 'IN_PROGRESS',
      required: true,
      milestoneId: M4.id,
      prerequisiteIds: ['t4-1'],
      requirementCitation: '요구사항: 권한 설계와 구현',
      gapCitation: '부족: RBAC 구현 경험',
      purpose: '역할별 접근 경계를 코드로 강제한다.',
      acceptanceCriteria: ['권한 매트릭스 문서', '거부 경로 테스트'],
      evidenceCount: 3,
      outcome: 'RBAC 가드',
    },
    // Parallel READY: both prerequisites DONE, run ACTIVE -> two eligible at once.
    {
      id: 't4-3',
      title: '감사 로그 기록 구현',
      state: 'READY',
      required: true,
      milestoneId: M4.id,
      prerequisiteIds: ['t4-1'],
      requirementCitation: '요구사항: 변경 이력 추적',
      gapCitation: '부족: 감사 로그 구현',
      purpose: '중요 변경은 누가 언제 했는지 남긴다.',
      acceptanceCriteria: ['로그 스키마', '기록 테스트'],
      evidenceCount: 2,
      outcome: '감사 로그',
    },
    {
      id: 't4-4',
      title: 'API 요청 속도 제한 적용',
      state: 'READY',
      required: true,
      milestoneId: M4.id,
      prerequisiteIds: ['t4-1'],
      requirementCitation: '요구사항: 남용 방지 설계',
      gapCitation: '부족: 속도 제한 구현',
      purpose: '버스트 요청을 제한해 서비스를 보호한다.',
      acceptanceCriteria: ['제한 정책 문서', '초과 응답 테스트'],
      evidenceCount: 2,
      outcome: '속도 제한 미들웨어',
    },
    {
      id: 't4-5',
      title: '외부 결제 샌드박스 연동 검증',
      state: 'BLOCKED',
      required: false,
      milestoneId: M4.id,
      prerequisiteIds: ['t4-2'],
      requirementCitation: '요구사항: 외부 연동 경험',
      gapCitation: '부족: 결제 연동 증거',
      purpose: '샌드박스 결제 흐름을 검증한다.',
      acceptanceCriteria: ['샌드박스 거래 1건'],
      evidenceCount: 1,
      outcome: '결제 연동 검증',
      blockedReason: '샌드박스 계정 발급 대기 중 (운영 응답 지연)',
    },

    // ---- M5: 5 tasks, LOCKED frontier with cross-milestone + optional ----
    {
      id: 't5-1',
      title: '단위 테스트 커버리지 확대',
      state: 'LOCKED',
      required: true,
      milestoneId: M5.id,
      prerequisiteIds: ['t3-3'],
      requirementCitation: '요구사항: 테스트 주도 개발',
      gapCitation: '부족: 커버리지 증거',
      purpose: '핵심 로직에 테스트를 채운다.',
      acceptanceCriteria: ['커버리지 70%', '실패 케이스 문서'],
      evidenceCount: 3,
      outcome: '커버리지 리포트',
    },
    {
      id: 't5-2',
      title: 'E2E 시나리오 자동화',
      state: 'LOCKED',
      required: true,
      milestoneId: M5.id,
      // Cross-milestone dependency: depends on M4's t4-3.
      prerequisiteIds: ['t4-3'],
      requirementCitation: '요구사항: E2E 자동화 경험',
      gapCitation: '부족: E2E 자동화 산출물',
      purpose: '핵심 사용자 흐름을 브라우저 테스트로 잠근다.',
      acceptanceCriteria: ['E2E 3개 시나리오', 'CI 실행 증거'],
      evidenceCount: 3,
      outcome: 'E2E 스위트',
    },
    {
      id: 't5-3',
      title: '성능 병목 측정과 개선',
      // Optional branch task deferred by the user (READY optional -> defer).
      state: 'DEFERRED',
      required: false,
      milestoneId: M5.id,
      prerequisiteIds: ['t4-4'],
      requirementCitation: '요구사항: 성능 최적화 감각',
      gapCitation: '부족: 측정 기반 개선 증거',
      purpose: '측정 후 개선하는 루프를 증명한다.',
      acceptanceCriteria: ['측정 리포트', '개선 전후 비교'],
      evidenceCount: 2,
      outcome: '성능 리포트',
    },
    {
      id: 't5-4',
      title: '접근성 점검과 수정',
      state: 'LOCKED',
      required: true,
      milestoneId: M5.id,
      prerequisiteIds: ['t1-5'],
      requirementCitation: '요구사항: 웹 접근성 준수',
      gapCitation: '부족: 접근성 점검 증거',
      purpose: '키보드/스크린리더로 전 흐름을 점검한다.',
      acceptanceCriteria: ['점검 결과 문서', '수정 커밋'],
      evidenceCount: 3,
      outcome: '접근성 점검 리포트',
    },

    // ---- M6: 4 tasks, LOCKED ----
    {
      id: 't6-1',
      title: '컨테이너 이미지 빌드 파이프라인',
      state: 'LOCKED',
      required: true,
      milestoneId: M6.id,
      prerequisiteIds: ['t5-2'],
      requirementCitation: '요구사항: 배포 자동화 이해',
      gapCitation: '부족: 이미지 파이프라인 구축',
      purpose: '동일 이미지로 어디서나 같게 실행한다.',
      acceptanceCriteria: ['이미지 빌드 워크플로', '버전 태깅'],
      evidenceCount: 2,
      outcome: '이미지 파이프라인',
    },
    {
      id: 't6-2',
      title: '스테이징 배포와 스모크 검증',
      state: 'LOCKED',
      required: true,
      milestoneId: M6.id,
      prerequisiteIds: ['t6-1'],
      requirementCitation: '요구사항: 배포 검증 경험',
      gapCitation: '부족: 스테이징 검증 증거',
      purpose: '배포 후 자동 스모크로 잠근다.',
      acceptanceCriteria: ['스모크 스크립트', '배포 기록'],
      evidenceCount: 2,
      outcome: '스테이징 배포',
    },
    {
      id: 't6-3',
      title: '롤백 절차 문서화와 리허설',
      state: 'LOCKED',
      required: true,
      milestoneId: M6.id,
      prerequisiteIds: ['t6-2'],
      requirementCitation: '요구사항: 운영 안전성 감각',
      gapCitation: '부족: 롤백 리허설 증거',
      purpose: '되돌릴 수 있는 배포를 만든다.',
      acceptanceCriteria: ['롤백 문서', '리허설 기록'],
      evidenceCount: 2,
      outcome: '롤백 리허설',
    },
    {
      id: 't6-4',
      title: '비밀 관리와 설정 분리',
      state: 'LOCKED',
      required: false,
      milestoneId: M6.id,
      prerequisiteIds: ['t6-1'],
      requirementCitation: '요구사항: 보안 설정 관리',
      gapCitation: '부족: 비밀 관리 증거',
      purpose: '비밀이 코드에 섞이지 않게 만든다.',
      acceptanceCriteria: ['환경 변수 목록', '유출 검사 통과'],
      evidenceCount: 2,
      outcome: '비밀 관리 규격',
    },

    // ---- M7: 4 tasks, LOCKED ----
    {
      id: 't7-1',
      title: '구조화 로그와 알림 연결',
      state: 'LOCKED',
      required: true,
      milestoneId: M7.id,
      prerequisiteIds: ['t6-2'],
      requirementCitation: '요구사항: 관측 가능성 구축',
      gapCitation: '부족: 로그/알림 구현',
      purpose: '문제를 조용히 놓치지 않게 만든다.',
      acceptanceCriteria: ['로그 규격', '알림 전달 증거'],
      evidenceCount: 2,
      outcome: '로깅 + 알림',
    },
    {
      id: 't7-2',
      title: '핵심 지표 대시보드 구성',
      state: 'LOCKED',
      required: false,
      milestoneId: M7.id,
      prerequisiteIds: ['t7-1'],
      requirementCitation: '요구사항: 지표 기반 운영',
      gapCitation: '부족: 대시보드 구축 경험',
      purpose: '서비스 상태를 한 화면에서 본다.',
      acceptanceCriteria: ['대시보드 스크린샷'],
      evidenceCount: 1,
      outcome: '운영 대시보드',
    },
    {
      id: 't7-3',
      title: '백업과 복구 절차 검증',
      state: 'LOCKED',
      required: true,
      milestoneId: M7.id,
      prerequisiteIds: ['t7-1'],
      requirementCitation: '요구사항: 데이터 보호 감각',
      gapCitation: '부족: 복구 리허설 증거',
      purpose: '잃어버리지 않는 시스템을 증명한다.',
      acceptanceCriteria: ['백업 리스토어 리허설'],
      evidenceCount: 2,
      outcome: '복구 리허설 기록',
    },
    {
      id: 't7-4',
      title: '부하 테스트와 임계치 정의',
      state: 'LOCKED',
      required: false,
      milestoneId: M7.id,
      prerequisiteIds: ['t7-2'],
      requirementCitation: '요구사항: 성능 한계 이해',
      gapCitation: '부족: 부하 테스트 증거',
      purpose: '한계를 숫자로 알게 만든다.',
      acceptanceCriteria: ['부하 테스트 리포트'],
      evidenceCount: 1,
      outcome: '부하 테스트 리포트',
    },

    // ---- M8: 4 tasks, LOCKED, ends at Proof ----
    {
      id: 't8-1',
      title: 'PR 병합과 변경 경로 정리',
      state: 'LOCKED',
      required: true,
      milestoneId: M8.id,
      prerequisiteIds: ['t5-2', 't6-2'],
      requirementCitation: '요구사항: PR 기반 협업 완성',
      gapCitation: '부족: 병합된 의미 있는 PR',
      purpose: '검증 규칙이 요구하는 PR을 완성한다.',
      acceptanceCriteria: ['병합된 PR', '변경 경로 충족'],
      evidenceCount: 2,
      outcome: '병합된 PR',
    },
    {
      id: 't8-2',
      title: '증거 규칙 전항목 통과 확인',
      state: 'LOCKED',
      required: true,
      milestoneId: M8.id,
      prerequisiteIds: ['t8-1'],
      requirementCitation: '요구사항: 검증 가능한 성과',
      gapCitation: '부족: 통과한 증거 규칙',
      purpose: '모든 필수 규칙이 기계적으로 통과한다.',
      acceptanceCriteria: ['규칙 전항목 PASS'],
      evidenceCount: 1,
      outcome: '증거 규칙 통과',
    },
    {
      id: 't8-3',
      title: 'Proof 스냅샷 발행 준비',
      state: 'LOCKED',
      required: true,
      milestoneId: M8.id,
      prerequisiteIds: ['t8-2'],
      requirementCitation: '요구사항: 결과물 문서화',
      gapCitation: '부족: 발행 가능한 Proof',
      purpose: '외부 검증 사실을 스냅샷으로 고정한다.',
      acceptanceCriteria: ['스냅샷 초안', '사실 목록 검토'],
      evidenceCount: 2,
      outcome: 'Proof 스냅샷 초안',
    },
    {
      id: 't8-4',
      title: '지원서용 서술 작성',
      state: 'LOCKED',
      required: false,
      milestoneId: M8.id,
      prerequisiteIds: ['t8-3'],
      requirementCitation: '요구사항: 자기소개 서술력',
      gapCitation: '부족: 증거 기반 서술',
      purpose: '사실과 서술을 분리해 쓴다.',
      acceptanceCriteria: ['서술 초안'],
      evidenceCount: 1,
      outcome: '지원 서술 초안',
    },
    {
      id: 't5-5',
      title: '보안 취약점 점검 자동화 스캐닝 태스크',
      state: 'LOCKED',
      required: false,
      milestoneId: M5.id,
      prerequisiteIds: ['t4-2', 't4-3', 't4-4'],
      requirementCitation: '요구사항: 보안 자동화 도구 활용 능력과 취약점 대응 체계 구축 경험',
      gapCitation: '부족: 취약점 스캐닝 파이프라인 구축 및 운영 증거',
      purpose: '취약점 점검을 사람 손이 아닌 파이프라인으로 만든다.',
      acceptanceCriteria: ['스캐너 CI 연동', '발견 항목 분류 문서'],
      evidenceCount: 2,
      outcome: '취약점 스캔 파이프라인',
    },
    {
      id: 't6-5',
      title: '멀티 환경 설정 프로파일과 배포 전략 검증 태스크',
      state: 'LOCKED',
      required: false,
      milestoneId: M6.id,
      prerequisiteIds: ['t6-2', 't6-3', 't6-4'],
      requirementCitation: '요구사항: 환경별 배포 전략 수립 능력과 설정 분리 원칙 준수',
      gapCitation: '부족: 멀티 환경 배포 프로파일 설계 및 검증 증거',
      purpose: '환경마다 다른 설정을 한 전략으로 관리한다.',
      acceptanceCriteria: ['프로파일 매트릭스 문서', '배포 전략 비교표'],
      evidenceCount: 2,
      outcome: '배포 전략 검증 문서',
    },
    {
      id: 't7-5',
      title: '장애 대응 플레이북 작성과 온콜 리허설 태스크',
      state: 'LOCKED',
      required: false,
      milestoneId: M7.id,
      prerequisiteIds: ['t7-1', 't7-2', 't7-3'],
      requirementCitation: '요구사항: 장애 대응 체계 구축 경험과 운영 문서화 능력',
      gapCitation: '부족: 장애 대응 플레이북 및 온콜 리허설 증거',
      purpose: '장애가 나도 절차대로 움직이게 만든다.',
      acceptanceCriteria: ['플레이북 문서', '리허설 소감 및 개선점'],
      evidenceCount: 2,
      outcome: '장애 대응 플레이북',
    },
    {
      id: 't8-5',
      title: 'Proof 발행 이후 공개 프로필 링크 검증 태스크',
      state: 'LOCKED',
      required: false,
      milestoneId: M8.id,
      prerequisiteIds: ['t8-2', 't8-3', 't8-4'],
      requirementCitation: '요구사항: 외부 검증 가능한 성과 공개 능력과 링크 관리 체계',
      gapCitation: '부족: 공개 Proof 링크의 유효성 검증 및 유지 증거',
      purpose: '발행된 Proof가 외부에서 접근되는지 확인한다.',
      acceptanceCriteria: ['공개 링크 접속 확인', '만료/갱신 정책 문서'],
      evidenceCount: 2,
      outcome: '공개 링크 검증 기록',
    },
  ],
};

/**
 * 1 milestone / 3 tasks fixture (UI_REFERENCE_PACK required fixture #1).
 * Also carries the stale/invalidated Proof presentation states.
 */
export const smallRunFixture: RoadmapFixture = {
  runId: 'exemplar-run-1x3',
  runState: 'BLOCKED',
  currentTaskId: 's2',
  recommendedTaskId: 's2',
  milestones: [{ id: 's1m', title: '1. 한글 요약 리포트 파이프라인' }],
  proof: {
    verification: 'STALE',
    publication: 'INVALIDATED',
  },
  tasks: [
    {
      id: 's1',
      title: '입력 형식 검증기 작성',
      state: 'DONE',
      required: true,
      milestoneId: 's1m',
      prerequisiteIds: [],
      requirementCitation: '요구사항: 입력 검증 설계',
      gapCitation: '부족: 검증기 구현',
      purpose: '잘못된 입력을 조기에 거른다.',
      acceptanceCriteria: ['검증 규칙 테스트'],
      evidenceCount: 2,
      outcome: '입력 검증기',
    },
    {
      id: 's2',
      title: '리포트 생성기 구현',
      state: 'BLOCKED',
      required: true,
      milestoneId: 's1m',
      prerequisiteIds: ['s1'],
      requirementCitation: '요구사항: 문서 생성 자동화',
      gapCitation: '부족: 생성기 구현',
      purpose: '검증된 입력에서 리포트를 만든다.',
      acceptanceCriteria: ['생성 테스트', '형식 스냅샷'],
      evidenceCount: 2,
      outcome: '리포트 생성기',
      blockedReason: '외부 폰트 라이선스 확인 전, 오프라인 대기',
    },
    {
      id: 's3',
      title: '출력 스냅샷 비교 도구',
      state: 'DEFERRED',
      required: false,
      milestoneId: 's1m',
      prerequisiteIds: ['s2'],
      requirementCitation: '요구사항: 회귀 방지 도구화',
      gapCitation: '부족: 스냅샷 비교 도구',
      purpose: '출력이 바뀌면 바로 보이게 한다.',
      acceptanceCriteria: ['비교 CLI'],
      evidenceCount: 1,
      outcome: '스냅샷 비교 CLI',
    },
  ],
};

/** Every task status must be present in the main fixture (pack requirement). */
export function assertFixtureCoversStates(): void {
  const states = new Set(mainRunFixture.tasks.map((t) => t.state));
  const all: TaskState[] = [
    'LOCKED',
    'READY',
    'IN_PROGRESS',
    'BLOCKED',
    'DEFERRED',
    'VERIFYING',
    'DONE',
  ];
  for (const s of all) {
    if (!states.has(s)) {
      throw new Error(`fixture missing required task state: ${s}`);
    }
  }
}
