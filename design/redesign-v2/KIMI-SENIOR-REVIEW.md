# Jagalchi UX Redesign — 시니어 리뷰 (Kimi Senior Review)

- **작성일자:** 2026-09-07
- **작성 주체:** Kimi Senior Design-Review Stage
- **입력 산출물:** `FORENSICS.md`, `PRESERVE-KILL-QUESTION.md`, `GEMINI-DIRECTIONS.md`
- **검증 기준:** 현재 저장소(`jagalchi-platform/ux-redesign` worktree) 실제 코드. Gemini 문서는 주니어 핸드오프로 취급, 주장 전부를 저장소와 대조했다.

---

## 0. 저장소 검증 결과 (Fact-Check)

Gemini 문서의 사실 주장을 코드와 대조한 결과다.

| Gemini 주장 | 판정 | 근거 |
| --- | --- | --- |
| 4개 분절 탭(지도/선형/포커스/Proof) 존재 | **사실** | `presentation-state.ts`: `ProjectRunSurface = 'map' \| 'linear' \| 'focus' \| 'proof'` |
| `RoadmapMapCanvas` / `ProjectRunFocusView` / `ProjectRunProofView` 존재 | **사실** | `features/project-runs/` 하위에 전부 존재. 맵 캔버스는 이미 데스크톱 상세 레일(detail rail, `role="complementary"`)과 모바일 오버레이를 보유 |
| 생성 위저드 11단계 내부 상태 머신 | **사실 (정확히 11개)** | `target-entry-wizard.tsx`의 `WizardStep` 유니온이 정확히 11개 (`intake` → `run-create`) |
| 다크 모드 순수 블랙 | **사실** | `globals.css` `.dark`: `--background: #000000`, `--surface: #0a0a0a`. 시맨틱 토큰 체계(success/warning/error + subtle 변형)는 이미 존재 |
| 홈에 레거시 로드맵 그리드 + 프로젝트 런 공존 | **사실** | `(myroadmap)/page.tsx`가 `MyRoadmapsGrid`와 `ProjectRunsSection`을 동시 렌더링 |
| 공고 URL 또는 텍스트 입력 | **사실** | `SUPPORTED_SOURCES`: 공개 채용 URL + 수동 캡처(본문 붙여넣기) |
| 추천 프로젝트 비교 선택 | **사실** | `proposal-comparison-grid.tsx` (`lg:grid-cols-3`), `ProjectProposalRecord.rank` |
| 노드별 "예상 시간" 표시 (방향성 A) | **미지원** | `RoadmapTask` 프로젝션 모델에 시간 필드 없음. `durationHours`는 `ProjectProposalPayload`(제안 단계)에만 존재. 태스크 노드에 표시하려면 프레젠테이션 매핑 추가가 필요 — 사용자 결정 사항 |
| 노드별 "난이도" 표시 (방향성 C) | **미지원** | 동일. `difficulty`도 제안 페이로드 수준 |
| 저장소 모드 "신규 생성/기존 연결/포크" (방향성 A) | **허위 — 계약 위반** | 실제 `REPOSITORY_MODE_ORDER = ['EXISTING_OWNED', 'OPEN_SOURCE_CONTRIBUTION', 'MANUAL_GREENFIELD']`. "신규 생성" 모드 없음, "포크" 모드 없음. 포크는 레거시 커뮤니티 로드맵(`/roadmaps/{id}/fork`)에만 존재하며 프로젝트 런 저장소 바인딩과 무관. **새 저장소 생성/포크 능력을 발명한 것으로, 제약 정면 위반** |
| "공개 링크 복사 + 공개 프로필 발행 토글" (방향성 A Proof) | **과도 단순화** | 실제로는 두 개의 별개 공개 체계: (1) 런 수준 `publish/unpublish/reverify`, (2) 계정 수준 Proof Profile(`ENABLED/DISABLED` + 증거별 게시 + **공개 기한(lease) 갱신** 의미론, `ProofProfileSettings`). `publicId`는 프로필 ENABLED 전까지 `null`. 단순 토글 2개로 표현 불가 — 리스/갱신/무효화 상태를 정직하게 노출해야 함 |
| "Tab 키로 모든 노드 순차 탐색" 접근성 (방향성 A) | **미검증 약속** | 현재 캔버스는 노드에 `tabIndex: 0`만 부여. React Flow 키보드 a11y props(`nodesFocusable` 등) 미확인. 수용 기준으로 강제해야 하며, 캔버스 없이 액션 패널만으로 전체 작업이 가능해야 한다는 상위 제약이 우선 |
| 검증 실행(Verify) 단일 주요 액션 | **사실 (서버 권위)** | `use-project-run-commands`: `verify` 포함 전 커맨드가 `ifMatch`(버전) + `idempotency-key` 헤더로 서버 권위 실행, 409 시 리프레시. 상태별 액션 가드는 서버가 강제 |

---

## 1. 세 방향성 평가 (사용자 제약 대조)

### 방향성 A: 단일 여정 워크스페이스 — **선택 (조건부, 하기 조임 적용)**

**적합성:**
- React Flow가 "의미 있고 중심적인" 여정 뷰 요구를 충족하면서, 실행은 우측 액션 패널이 담당해 **캔버스 조작 없이 키보드/모바일 핵심 작업 완결 가능** — 핵심 제약과 정합.
- 기존 자산 재조합 주장이 사실로 확인됨: `RoadmapMapCanvas`는 이미 상세 레일을 내장하고, `ProjectRunFocusView`는 상태별 서버 권위 커맨드를 전부 노출. 탭 분기를 마스터-디테일 동기화로 바꾸는 것은 프레젠테이션 재배치이지 계약 변경이 아님.
- 4탭 제거, 홈 이중 그리드 제거, 11단계 캡슐화 모두 포렌식 루트 원인과 정확히 대응.

**조임(Tightening) 필요 사항:**
1. 저장소 모드 표현을 실제 계약(`EXISTING_OWNED`/`OPEN_SOURCE_CONTRIBUTION`/`MANUAL_GREENFIELD`)으로 교정. "신규 생성/포크" 문구 삭제.
2. Proof 패널은 단순 토글이 아니라 **런 공개 상태 + 프로필 공개 상태 + 증거별 리스/갱신**을 구분하는 정직한 상태 뷰여야 함.
3. 모바일 전환이 "타임라인(또는 바텀시트 결합 캔버스)"로 모호함. **모바일 기본은 선형 여정 타임라인 + 고정 Next Action 바**로 확정하고, 캔버스는 선택적 확장으로 격하.
4. 노드 "예상 시간"은 프로젝션에 없으므로 v1 범위에서 제외하거나, 제안 단계 `durationHours`의 프레젠테이션 매핑으로 명시적 승인 필요.

### 방향성 B: 작업 스트림 우선 — **기각 (단, 모바일 패턴은 흡수)**

- 치명적 결함: React Flow가 "전체 화면 오버레이/모달"로 격하되어 **"React Flow가 프로젝트 여정을 보여줄 만큼 의미 있고 중심적"**이라는 사용자 제약을 충족하지 못함. Gemini 자신도 리스크로 인정.
- 접근성 주장("완벽한 표준 HTML 목록")은 방향 자체의 장점이 아니라 구현 품질의 문제 — A에서도 동일하게 달성 가능.
- 단, **선형 스트림 + 인라인 확장 태스크 실행기는 모바일 기본 뷰로 우수**. A의 모바일 전환에 이 패턴을 이식한다.
- 제네릭 템플릿 리스크: 순수 선형 체크리스트는 임의의 투두 앱과 구분되지 않음.

### 방향성 C: 스테이지-게이트 캔버스 허브 — **기각**

- **제약 정면 위반:** "확대 줌 레벨에서 노드 내부에 검증 실행 버튼"은 핵심 작업이 캔버스 조작을 요구한다는 뜻. "캔버스 조작이 핵심 모바일/키보드 작업에 요구되어선 안 된다"는 제약과 충돌. `Alt+N` 단축키와 선형 모드 토글은 캔버스 우선 설계의 사후 패치다.
- 모바일에서 "세로형 카드 스와이퍼로 전면 대체" = 사실상 두 개의 제품을 빌드. 구현 비용 High + 유지보수 분기 리스크.
- 캔버스 내 폼/버튼은 React Flow의 팬/줌 제스처와 터치 이벤트 충돌이 알려진 패턴. 검증 실행 같은 서버 권위 액션을 제스처 충돌 영역에 두는 것은 부적절.
- "은은한 블루/그린 보더 발광"은 장식 배제 제약과 경계선상 — 상태 표현은 시맨틱 토큰으로 충분.

---

## 2. 지적 사항 요약 (제약 위반 및 리스크)

1. **미지원 API 주장 (심각):** 저장소 "신규 생성/포크" 모드 — 실제 계약에 없음. 어떤 프리셋에도 포함 금지.
2. **공개 증명 단순화 (심각):** Proof 공개는 단일 토글이 아니라 런 공개/프로필 활성화/증거별 리스 갱신의 3층 구조. UI는 이를 정직하게 반영해야 하며, "1-Click 링크 복사"는 `publicId`가 존재할 때만 노출.
3. **허위 접근성 약속 위험 (중간):** "Tab으로 모든 노드 탐색"은 현재 미구현. 약속이 아니라 수용 기준으로 강제하고, 캔버스 비의존 완결 경로를 우선 검증.
4. **하드코드 토큰 위반 위험 (중간):** Gemini의 hex 팔레트(`#111215` 등)는 **토큰 정의값으로만** `globals.css` 시맨틱 토큰에 반영하고, 컴포넌트 직접 hex 스타일링은 금지. 또한 제안된 시맨틱 악센트(`#22c55e` 등)가 기존 토큰값(`--success: #35c88a` 등)과 다름 — 토큰값 변경은 허용되나 토큰 경유만 허용.
5. **제네릭 템플릿 리스크 (중간):** B의 순수 스트림은 범용 투두 앱, C의 HUD 캔버스는 범용 노드그래프 SaaS 템플릿으로 읽힐 위험. 차별화는 "여정 맥락 + 다음 행동"의 결합에서 나온다.
6. **모바일 인터랙션 리스크 (중간):** A의 모호한 모바일 전환, C의 별도 모바일 뷰. 모바일 기본 경로를 선형으로 명시하지 않으면 캔버스 의존이 스며든다.

---

## 3. 최종 RedesignPreset 후보

### Preset 1: Journey Workspace (여정 워크스페이스) — 방향성 A 교정판

```yaml
name: Journey Workspace
thesis: >
  4개 분절 탭을 해체하고, React Flow 여정 캔버스(맥락)와 액션 실행 패널(행동)을
  하나의 동기화된 워크스페이스로 통합한다. 사용자는 진입 즉시 "다음 유의미한 작업"을
  보고, 캔버스는 어디까지 왔는지를 보여준다. 모든 핵심 작업은 패널만으로 완결된다.
preserve:
  - 프로젝트/태스크/증명 도메인 데이터, API 계약, 상태 가드, 멱등성, 픽스처 정직성
  - React Flow 엔진과 RoadmapMapCanvas의 노드/엣지/레이아웃 로직
  - ProjectRunFocusView의 상태별 서버 권위 커맨드(시작/막힘/보류/재개/검증/AI 도움/PR 바인딩)
  - Wanted Sans, 시맨틱 토큰 체계, 라이트/다크 지원
  - Proof 공개의 3층 의미론(런 공개 / 프로필 활성화 / 증거별 리스·갱신)
remove:
  - map/linear/focus/proof 4개 피어 탭
  - 홈의 레거시 빈 로드맵 그리드(프로젝트 런 카드만 잔류)
  - 기본 읽기 계층의 raw ID/enum/프로젝션 버전/provenance 노출
  - 생성 위저드의 11단계 내부 상태 노출
  - 순수 블랙(#000000) 다크 배경
layout:
  shell: 기존 AppShell 유지(글로벌 헤더 + 모바일 하단 내비 — 하단 내비 존속은 사용자 결정)
  home: 상단 Next Action Hero(활성 런 1개, 1-Click 진입) + 하단 프로젝트 런 카드 목록
  detail: 데스크톱 = 좌 캔버스 60% / 우 액션 패널 40% 마스터-디테일; 탭 없음
  navigation: 캔버스 노드 선택 ↔ 패널 내용 양방향 동기화, 딥링크는 taskId 쿼리
  density: 현재 작업 고밀도, 완료/미래 작업은 점진적 축소(체크포인트/잠금 반투명)
visual:
  palette: >
    다크 = 레이어드 차콜(배경/카드/포커스 3단계, 순수 블랙 금지)을 globals.css
    시맨틱 토큰값으로만 정의. 상태는 기존 success/warning/error 토큰 계열 유지·조정.
    라이트 테마 토큰 대칭 유지.
  typography: Wanted Sans 유지, 단계 번호·상태 레이블 위계 강화
  radius: 기존 라디우스 스케일 유지(시각 보존 수준: 중간)
  imagery: 장식 이미지 없음. 검증 아티팩트(PR, 로그)만 콘텐츠로 노출
  iconography: 상태 아이콘 + 텍스트 레이블 병기(색상 단독 전달 금지)
components:
  - ProjectRunWorkspace(마스터-디테일 컨테이너, 기존 workspace 리팩터)
  - NextActionHero(홈 + 상세 상단 앵커)
  - JourneyMapCanvas(기존 RoadmapMapCanvas 계승, 마일스톤 스테이지 카드 노드)
  - ActionExecutionPanel(기존 FocusView 계승, 태스크 가이드 + 상태별 서버 권위 액션)
  - ProofReportPanel(기존 ProofView 계승, 3층 공개 상태 정직 표현)
interaction:
  filtering: 패널 내 상태 필터 유지(기존 statusFilter), 캔버스는 현재 경로 하이라이트
  primaryAction: 현재 태스크의 상태별 단일 주요 액션(READY=시작, IN_PROGRESS=검증 요청 등) — 서버 가드 그대로
  feedback: 비동기 검증/커맨드 결과는 패널 인라인 피드백, 409/STALE_PROJECTION 시 자동 리프레시 안내
risks:
  - 캔버스↔패널 선택 상태 동기화 복잡도(기존 selectedTaskId 상태로 흡수 가능)
  - 모바일 타임라인과 데스크톱 캔버스의 정보 동등성 유지 비용
```

### Preset 2: Stream-Led with Living Map Rail (스트림 주도 + 상시 맵 레일) — B 교정판

```yaml
name: Stream-Led with Living Map Rail
thesis: >
  실행 표면은 전 브레이크포인트에서 선형 여정 스트림으로 통일하되, React Flow를
  모달이 아닌 상시 노출되는 여정 레일(데스크톱 상단/측면, 모바일 접이식 가로 스트립)로
  유지해 "의미 있고 중심적인" 제약을 충족한다. A보다 저렴한 대안.
preserve: Preset 1과 동일
remove:
  - Preset 1과 동일 + 상시 대형 캔버스 분할 뷰
layout:
  shell: AppShell 유지
  home: Next Action Hero + 런 카드 목록(동일)
  detail: 단일 컬럼 선형 스트림(최대 ~840px) + 상시 맵 레일; 현재 태스크 인라인 확장
  navigation: 스트림 항목 ↔ 맵 레일 노드 양방향 하이라이트
  density: 완료 접힘 / 현재 확장 / 미래 잠금의 3단 밀도
visual: Preset 1과 동일(차콜 레이어, 시맨틱 토큰, Wanted Sans)
components:
  - JourneyStreamList(ol/li + aria-expanded 아코디언)
  - InlineTaskExecutor(기존 FocusView 로직 인라인화)
  - LivingMapRail(React Flow 읽기 중심 축소 뷰, 노드 선택 시 스트림 스크롤 동기화)
interaction:
  filtering: 스트림 내 상태 필터
  primaryAction: 현재 확장 태스크의 상태별 단일 주요 액션
  feedback: 인라인 검증 피드백(동일)
risks:
  - 맵 레일이 축소되며 "중심적" 요구의 해석 논쟁 가능 — 승인 게이트에서 사용자 판단 필요
  - 제네릭 스트림 룩으로 흐를 위험을 맵 레일 상시 노출로 상쇄해야 함
```

### Preset 3: Stage Canvas Hub (스테이지 캔버스 허브) — C 교정판 (비추천)

```yaml
name: Stage Canvas Hub
thesis: >
  React Flow 전체 화면 캔버스가 제품의 무대. 단, 시맨틱 줌 노드 내부 실행은 폐기하고
  실행은 항상 캔버스 외부 패널에서 수행(제약 준수 교정).
preserve: Preset 1과 동일
remove: Preset 1과 동일 + 정적 분할 레이아웃
layout:
  shell: AppShell 유지(헤더 아래 전체 캔버스)
  home: 런 카드 목록(캔버스 허브 홈은 기각 — 홈은 목록이 정직)
  detail: 전체 화면 캔버스 + 플로팅 Next Action 버튼 + 선택 시 외부 실행 패널
  navigation: 캔버스 팬/줌 + Next Action 카메라 이동
  density: 줌 티어(overview/task) 2단만 — 노드 내 실행 티어 폐기
visual: Preset 1과 동일 + 캔버스 그리드 닷(토큰 정의)
components:
  - FullBleedCanvas, StageNode(2단 줌), ExternalActionPanel, LinearFallbackView(모바일/키보드 완결 경로)
interaction:
  filtering: 캔버스 필터 + 선형 폴백 동일 필터
  primaryAction: 외부 패널의 상태별 단일 주요 액션
  feedback: 패널 인라인(동일)
risks:
  - 모바일/키보드 완결을 위한 선형 폴백이 사실상 Preset 2의 스트림과 중복 구현 — 이중 유지보수
  - 구현 비용 최고, 제스처 충돌 테스트 부담
  - 차별화는 크나 실익 검증 부족
```

---

## 4. 추천: **Preset 1 (Journey Workspace)**

이유:
1. **제약 충족의 유일한 균형점.** React Flow 중심성(캔버스 상시 60%)과 캔버스 비의존 완결(액션 패널)을 동시에 만족하는 유일한 구조. B는 전자 실패, C는 후자 실패.
2. **검증된 최저 리스크.** 재사용 주장이 코드로 확인됨 — 맵 캔버스는 상세 레일을 이미 보유하고, FocusView는 전 커맨드를 이미 노출한다. 작업은 "탭 분기 → 동기화 배치"의 프레젠테이션 재구성이며 계약 변경 0건.
3. **모바일 답이 내재됨.** 모바일 기본을 Preset 2의 선형 스트림으로 두면(캔버스는 선택 확장) 두 프리셋이 모바일에서 수렴하여 전환 비용이 사라진다.

---

## 5. Exemplar-First 구현 경계

**Exemplar:** 프로젝트 상세 워크스페이스(`/projects/[runId]`) 1개 화면. 제약 밀도가 가장 높은 표면(React Flow + 상태별 액션 + 다크 토큰 + 키보드/모바일 완결)이므로 여기서 검증해야 나머지 롤아웃이 안전하다.

**경계:**
- 허용: `features/project-runs` 프레젠테이션 레이어 재구성, `globals.css` 시맨틱 토큰값 추가/조정, AppShell 내 상세 레이아웃 슬롯.
- 금지: API 계약/커맨드/상태 머신 변경, 신규 저장소·공개링크·프로바이더 능력 발명, 다른 화면(홈/생성/Proof 설정) 동시 변이, 컴포넌트 내 직접 hex 스타일링.
- Exemplar QA 통과 전 홈/생성 롤아웃 금지. 홈과 생성은 각각 2차·3차 웨이브.

**수용 기준:**

*구조:*
- [ ] 4개 탭이 제거되고 캔버스+패널 단일 워크스페이스가 렌더링된다
- [ ] 노드 선택 시 패널이 동기화되고, 패널 없이/캔버스 없이 각각 핵심 작업(시작→검증 요청→결과 확인)이 완결된다
- [ ] 기본 읽기 계층에 raw ID/enum/프로젝션 버전/provenance가 없다
- [ ] Proof 패널이 런 공개/프로필 활성화/증거 리스 3층을 구분 표시하고, `publicId == null`이면 링크 복사를 노출하지 않는다

*접근성:*
- [ ] 캔버스 조작 없이 키보드만으로 전체 작업 흐름 완결(패널 경유)
- [ ] 캔버스 노드 키보드 탐색(Tab/방향키 + Enter 선택)이 실제로 동작 — 구현 후 검증, 약속으로 대체 금지
- [ ] 모든 상태가 색상+텍스트 레이블 병기, 현재 단계에 `aria-current="step"`
- [ ] 모바일 뷰포트에서 캔버스 없이 선형 타임라인만으로 동일 작업 완결

*시각:*
- [ ] `.dark` 배경이 `#000000`이 아니며 배경/카드/포커스 3단계 차콜이 시맨틱 토큰으로 정의됨
- [ ] 컴포넌트 소스에 직접 hex 0건(토큰 참조만), WCAG AA 대비 충족
- [ ] 글래스/네온/컨페티/장식 모션 0건

*설계 의도:*
- [ ] 진입 5초 내 "다음에 할 일"을 사용자가 식별 가능(블라인드 QA로 확인)
- [ ] 캔버스가 장식이 아니라 완료/현재/잠금 여정을 서술
- [ ] 모든 상태별 액션이 서버 가드 응답(409/STALE_PROJECTION 등)을 정직하게 표현

---

## 6. 사용자 전속 결정 사항

1. **프리셋 승인** — Preset 1 추천안의 승인/수정/기각 (승인 게이트).
2. **레거시 로드맵 에디터의 장기적 거처** — 홈에서 제거 후 별도 섹션 유지인지, 완전 폐기인지 (PRESERVE-KILL Question 잔존).
3. **공개 증명 리소스 계약의 정확한 범위** — 런 공개와 Proof Profile 공개를 하나의 화면 흐름으로 묶을지, 현행 2계약 분리를 UI에도 유지할지.
4. **모바일 하단 내비게이션 존속** — 현행 `MobileBottomNav` 유지 여부.
5. **프로젝트 명칭용 additive API 필드** — 헤더에 UUID 대신 표시할 이름 필드의 신규 추가 승인 여부(유일한 API 접촉 후보).
6. **노드 "예상 시간" 표시** — 제안 단계 `durationHours`를 태스크 노드에 프레젠테이션 매핑할지(v1 제외 권장).
7. **다크 팔레트 최종값** — Gemini 제안 hex 계열 채택 여부와 기존 시맨틱 악센트값(`#35c88a` 등)의 조정 폭.
