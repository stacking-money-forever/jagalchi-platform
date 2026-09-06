# Design preset — Phase 2 Project Runs closure

> Status: `EXEMPLAR_CONFIRMED_ROLLOUT_ALLOWED`
> Scope: `extend`
> Canonical base: `design/README.md` and `design/PRESET-coursebook-20260831.md` V3
> Approval receipt: `{ gate: "design-preset", selectedPreset: "phase2-project-runs-closure", approvedByUser: true, scope: ["/myroadmap Project Runs exemplar", "Proof provenance"] }`
> Approval: user message `그대로 가` on 2026-09-07
> Exemplar confirmation: user message `뭐임 존나 이쁘노` on 2026-09-07

## Thesis

`/myroadmap`에서 편집 가능한 로드맵과 읽기 전용 Project Run을 같은 작업 공간 안에서
예측 가능하게 구분하고, 사용자가 진행 중인 실행으로 즉시 돌아가게 한다. Proof는
검증 수준, 검증 출처, 발행 상태를 분리해 fixture 결과를 실제 GitHub 검증으로
오해하지 않게 한다.

## Preserve

- Jagalchi Core V3의 Wanted Sans, black/white 행동 위계, semantic status 색상
- 기존 `AppShell`, `MyRoadmapsLayout`, sidebar, toolbar와 카드 밀도
- 편집 가능한 로드맵의 검색, 필터, 정렬, 생성, 이름 변경, 삭제 동작
- Project Run roadmap의 read-only 경계와 owner-scoped API 계약
- 기존 lucide 아이콘, radius, spacing, focus-ring 토큰

## Remove or avoid

- 새 dashboard, 통계, 추천, 검색 subsystem
- blue/purple brand paint, gradient, glass, 장식용 motion과 임의 pill
- Project Run을 편집 가능한 roadmap 카드처럼 보이게 하는 메뉴와 affordance
- fixture provider를 repository 이름이나 암묵적 카피로만 구분하는 표현
- 성공·검증·발행을 하나의 상태 badge로 합치는 표현

## Layout

- Shell: 기존 `/myroadmap` shell과 sidebar를 그대로 사용한다.
- Home: header 아래에 `프로젝트 실행` 섹션을 먼저 두고, 기존 `내 실행 과제` toolbar와
  편집 로드맵 grid는 아래에서 그대로 유지한다.
- Project Runs: 첫 페이지를 간결한 읽기 전용 list로 표시한다. 각 row는 목표/역할,
  현재 상태, 현재 또는 추천 task, 최근 갱신 시각, `이어서 실행`을 제공한다.
- Pagination: `더 보기`로 server cursor를 소비한다. 무한 스크롤은 사용하지 않는다.
- Density: desktop은 한 줄 정보 위계, 390px은 세로 stack으로 재배치한다.

## Visual

- Palette: 기존 semantic tokens만 사용한다. 상태 색은 상태 전달에만 사용한다.
- Typography: Wanted Sans와 기존 type scale을 유지한다. 제목, 상태, 보조 정보는
  weight/size/leading 조합으로 구분한다.
- Radius/spacing: 기존 card/list 토큰을 재사용하고 새 primitive를 만들지 않는다.
- Iconography: lucide 16px inline 또는 20px standard만 사용한다.
- Motion: `N/A`. 목록 진입과 pagination에 장식적 animation을 추가하지 않는다.

## Components and states

- `ProjectRunsSection`: section heading, 짧은 설명, count를 표시한다.
- `ProjectRunRow`: 전체 row를 링크로 만들지 않고 명시적인 `이어서 실행` 링크를 둔다.
  row에는 rename/delete/edit affordance를 노출하지 않는다.
- Loading: 실제 row 높이에 가까운 skeleton 또는 명시적 status를 사용한다.
- Empty: `진행 중인 프로젝트 실행이 없습니다`와 `/create` 진입을 제공하되 feature
  flag가 꺼져 있으면 생성 CTA를 노출하지 않는다.
- Error: inline alert와 같은 위치의 재시도 행동을 제공한다.
- Pagination: 진행 중 feedback과 중복 클릭 방지를 제공한다.
- Proof provenance: `검증 수준`, `검증 출처`, `발행 상태`를 별도 label/value로 표시한다.
  fixture이면 `로컬 fixture 기준 · 실제 GitHub 검증 아님`을 명시한다.

## Interaction contract

- Primary action: `이어서 실행`은 current task가 있으면 그 task의 Focus로, 없으면
  recommended task로, 둘 다 없으면 Project Run 기본 화면으로 이동한다.
- Wayfinding: 사용자는 현재 `/myroadmap`에 있고, 어떤 항목이 편집 로드맵이며 어떤
  항목이 실행 중인 Project Run인지 즉시 구분할 수 있어야 한다.
- Agency: 기존 로드맵 편집 동작을 바꾸지 않고, Project Run에는 읽기 전용임을
  명확히 표시한다.
- Feedback: loading, empty, error, pagination, 완료 상태를 시각·텍스트로 구분한다.
- Interruption/reduced motion: 기능적 motion이 없으므로 현재 상태와 focus가 즉시
  갱신되며 `prefers-reduced-motion`에서 의미 손실이 없어야 한다.

## Data and routing contract

- Source: generated `ProjectRunListResponseDto`와 `listProjectRuns(transport, params)`만
  사용한다. 첫 요청은 `limit=20`, 다음 요청은 응답의 nullable `nextCursor`를 그대로
  전달한다.
- Run state: `READY | ACTIVE | BLOCKED | COMPLETED | ARCHIVED`. row의 semantic badge는
  이 전체 상태 하나에만 사용하고 task 상태는 neutral text로 표시한다.
- Label: `target.company`와 `target.role`이 있으면 실제 값을 표시한다. 없으면
  `프로젝트 실행 {id 앞 8자}`를 사용하며 fixture 제목을 만들어내지 않는다.
- Resume target: `currentTaskId ?? recommendedTaskId`가 있으면
  `/projects/{encoded id}?task={encoded task id}`, 없으면 `/projects/{encoded id}`다.
- Empty CTA: `EVIDENCE_EXECUTION_ENABLED`와 `PROJECT_RUNS_ENABLED`가 모두 true일 때만
  `/create` 링크를 표시한다.
- Pagination: `nextCursor`가 null이면 `더 보기`를 숨긴다. 요청 중 중복 실행을 막고,
  성공 시 id 기준으로 중복 없이 append한다. 실패하면 기존 rows와 cursor를 보존하고
  같은 위치에 재시도를 제공한다.
- Proof: `verification.state`는 `PENDING | PASS | FAIL | STALE`, facts provider는
  `fixture | github`, publication state는 `ACTIVE | UNPUBLISHED | INVALIDATED`다. facts가
  없으면 provider를 추측하지 않고 `검증 출처 없음`으로 표시한다.

## Responsive and approval contract

- 기존 `sm`/`lg` breakpoint만 사용한다. `lg` 이상은 row, 그 미만은 정보 우선순위를
  보존한 stack이며 별도 중간 breakpoint를 만들지 않는다.
- 390px와 1440px의 Light/Dark, browser text scaling 200%, keyboard-only flow에서
  horizontal overflow, clipping, overlap이 없어야 한다.
- 승인 주체는 사용자다. 승인 기록은
  `{ gate: "design-preset", selectedPreset: "phase2-project-runs-closure", approvedByUser: true, scope: ["/myroadmap Project Runs exemplar", "Proof provenance"] }`로 남긴다.

## Exemplar and rollout

1. `/myroadmap`의 populated Project Runs section 한 화면만 exemplar로 구현한다.
2. 390px/1440px Light/Dark, keyboard focus, text scaling, overflow를 검증한다.
3. 사용자 exemplar 확인 후 loading/empty/error/pagination으로 확장한다.
4. 동일 preset으로 Proof provenance 표시를 적용한다.

## Acceptance gate

- 기존 Jagalchi V3 토큰과 컴포넌트만 사용하고 새 평행 primitive가 없다.
- Project Run과 편집 로드맵의 의미와 행동이 혼동되지 않는다.
- 생성 CTA와 destination이 `PROJECT_RUNS_ENABLED` 계약과 일치한다.
- keyboard만으로 `더 보기`, `이어서 실행`, retry를 사용할 수 있고 focus가 보인다.
- 390px/1440px, Light/Dark, text scaling에서 clipping/overlap이 없다.
- fixture Proof가 실제 GitHub 검증으로 읽히지 않는다.
- structural, accessibility, visual, design-intent QA를 별도 evidence로 남긴다.
- 구현자가 만든 assertion만으로 시각·사용성 통과를 선언하지 않는다. 자동화는 route,
  state, contract와 accessibility mechanics를 검증하고, exemplar의 hierarchy와
  wayfinding은 사용자 승인 및 구현 세션과 분리된 fresh-context review로 판정한다.

## Risks

- 기존 `/myroadmap`의 편집 로드맵 필터와 Project Run 목록 필터를 섞으면 검색 의미가
  모호해질 수 있다. P2에서는 Project Runs 검색을 추가하지 않는다.
- 상태 badge를 과도하게 쓰면 정보 위계가 흐려질 수 있다. 핵심 상태 하나만 semantic
  treatment를 쓰고 나머지는 label/value text로 둔다.
- Project Run target 정보가 없을 수 있으므로 fallback label을 계약으로 정하고
  fixture 제목을 만들어내지 않는다.

## Exemplar evidence

> Status: `CONFIRMED`
> Storybook: `http://127.0.0.1:6006/iframe.html?id=features-project-runs-closure-exemplar--populated&viewMode=story`

- Implemented only the populated `ProjectRunsSection` and its `/myroadmap` placement.
- Supported API fields now include typed `target`, optional `updatedAt`, nullable cursor,
  and owner-scoped list response.
- Component unit test, web typecheck, focused lint, API 496 tests, OpenAPI freshness,
  generated-client tests/typecheck/upstream sync passed.
- Ego Lite rendered the Storybook exemplar with repository Wanted Sans loaded.
- 1440px and 390px Light/Dark had `scrollWidth === clientWidth`.
- 390px at 200% root text scaling retained horizontal bounds; vertical scrolling increased
  as expected.
- Keyboard Tab produced `:focus-visible` on `이어서 실행` with a 3px semantic ring.
- Rendered HTML passed all 73 anti-slop guards with severity 0.
- Ego Lite screenshot capture timed out twice. Visual screenshot judgment remains
  `NEEDS-MANUAL-EYES`; DOM, computed style, bounds, and semantic-tree evidence passed.

After exemplar confirmation, loading, empty, error/retry, pagination, and Proof provenance were
implemented under the same preset. Their final no-MSW runtime evidence remains pending.

## Final theme and motion gates

- `/myroadmap` Project Runs and Proof provenance must pass at 1440px and 390px in explicit
  Light and Dark modes. The final no-MSW E2E run preserves screenshots for all eight
  route/viewport/theme combinations.
- `apple-design` review must pass purpose, agency, familiarity, flexibility, simplicity,
  craft, wayfinding, feedback, text scaling, focus, contrast, and reduced-motion behavior.
- `review-animations` must return `Approve` for the changed UI and shared primitives. Any
  finding is a P2 completion blocker until fixed and re-reviewed.
- New Project Runs surfaces intentionally add no entrance, list, or pagination motion. Existing
  press/focus/transition behavior remains in review scope and must not animate keyboard-driven
  navigation or layout properties.

### Apple-design implementation review

Verdict: `APPROVE_FOR_FINAL_RUNTIME_QA`.

- Purpose/Simplicity: one owner list and state-specific return action; no dashboard/search scope.
- Agency/Familiarity: editable roadmaps remain unchanged and Project Runs stay read-only.
- Flexibility/Craft: existing V3 tokens, Wanted Sans, 44px actions, long-copy wrapping,
  1440px/390px, Light/Dark, and 200% text scaling are covered.
- Wayfinding/Feedback: loading, empty, error/retry, pagination, run state, task, and destination
  are explicit without color-only meaning.
- Accessibility: destination-qualified link names, keyboard focus, pointer-only press feedback,
  and non-vestibular reduced-motion behavior are implemented.

Final approval remains conditional on the same checks passing on the current-source no-MSW stack.

### Review-animations implementation review

| Before | After | Why |
| --- | --- | --- |
| shared `active:scale` could apply to keyboard activation | press scale is gated by `hover`, `pointer: fine`, and `no-preference` | high-frequency keyboard actions must not animate |
| shared transitions included paint-heavy properties | normal transitions are limited to `opacity, transform` at 150ms with the approved strong ease-out curve | keeps interaction responsive and compositor-friendly |
| reduced motion removed every transition | transform/animation movement is removed while 120ms color/opacity feedback remains | reduced motion must preserve comprehensible feedback |
| loading pulse/spinner ignored reduced motion | both use `motion-reduce:animate-none` with textual/ARIA feedback preserved | progress remains understandable without looping motion |
| task selection used `transition-shadow` | task selection/focus ring now updates immediately | repeated and keyboard-driven selection should not animate |

Verdict: `Approve`. No `transition-all`, `scale(0)`, `ease-in`, layout-property animation,
ungated hover transform, over-300ms UI transition, or missing reduced-motion handling remains in
the reviewed Project Runs scope. Repeat this review after final runtime QA; any new finding blocks
P2 completion.
