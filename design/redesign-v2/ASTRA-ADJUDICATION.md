# Jagalchi redesign v2: 독립 제품·UX 최종 판정

**Overall verdict: REQUEST_CHANGES**
**Codex recommendation: proceed with corrections. 프리셋 문서 정정까지 진행하고, 사용자 승인 전 제품 화면 구현은 중지한다.**

- Understood as: 여섯 선행 산출물을 권위가 아닌 주장으로 읽고, 현재 웹 코드·생성 계약과 대조하여 프리셋 승인에 올릴 수 있는지 판정한다. **이번 심사에서는** 이 문서 외 제품 코드·선행 문서·설정을 변경하지 않는다. 후속 프리셋 작성은 Codex에 대한 권고이며 이 심사의 실행 범위가 아니다.
- 조사 기준: `ux-redesign`, `codex/jagalchi-ux-redesign`, HEAD `5e9178bfdc9a75f2de2075c54806609c29f8a670`. 조사 시작 시 변경은 untracked `.omp-role/`, `design/redesign-v2/`였다.
- 앞선 audit worktree의 GLM 변경은 별도 미커밋 스냅샷이다. 해당 소스에서 AppShell·PR 분기·planView 변경을 확인했지만 현재 redesign 소스에 적용된 것으로 계산하지 않았다.
- 검증 범위: 지정 문서 여섯 개 전체, 아래에 인용한 프런트엔드·계약 소스, 실제 순수 함수 실행 두 사례, 후보 색상 대비 계산. 브라우저·실 API·실 GitHub·사용자 과업은 실행하지 않았다. 이 문서는 시각 QA, 접근성 인증, 실 provider 검증 또는 구현 승인 receipt가 아니다.
- 이후 표에서 `verified`는 해당 소스/실행에서 확인된 범위만 뜻한다. `inference`는 추론, `unsupported`는 증거 부족, `contradicted`는 제약 또는 확인한 코드와 충돌, `user decision`은 제품 선택이다. **소스가 존재함과 사용자에게 제대로 작동함은 다르다.**

## 1. 단일 판정과 승인 게이트 차단 사유

**문제 진단은 대체로 맞다. 선택 방향은 유망하다. 그러나 Kimi의 교정판을 그대로 승인 게이트에 올리면 안 된다.** 다음 다섯 조건을 프리셋 계약에 먼저 반영해야 한다.

1. **중요한 지도와 큰 지도를 혼동하지 말 것.** 사용자 요구에는 React Flow 60% 상시 점유가 없다. 작업 패널이 읽기 위계의 주인이고 지도는 실제 선행 관계·현재 위치를 설명해야 한다. 고정 60:40은 후보 배치이지 불변 조건이 아니다.
2. **안전한 단일 행동을 task enum 하나로 결정하지 말 것.** run 상태, 권한/최신성, 진행 중 operation, 현재 작업과 탐색 선택의 차이, 저장소·PR 연결을 먼저 판단해야 한다. Kimi의 `IN_PROGRESS=검증 요청`은 GLM 보고서가 이미 발견한 PR 분기를 다시 잃었다.
3. **공개 ID가 있다는 이유로 공유를 약속하지 말 것.** run publication, mission 단위 profile publication, profile aggregate는 연결이 입증되지 않은 서로 다른 식별자 경계다. `publicId != null`은 충분한 공유 조건이 아니다.
4. **기존 graph 로직을 무조건 보존하지 말 것.** 실제 실행에서 빈 작업 목록은 Proof 완료 값 `1`, 빈 milestone은 비유한 좌표, milestone 없는 유효 task는 누락됐다. 엔진·계약 보존과 잘못된 프레젠테이션 보존은 다르다.
5. **대표 화면의 범위와 게이트를 일치시킬 것.** 전역 `.dark` 수정은 한 화면 변경이 아니다. 상세 하나를 한다면서 계정 공개 설정 전체를 포함하지 않는다. Kimi의 “패널 없이/캔버스 없이 각각 실행 완결” 조건은 본인의 외부 실행 패널 원칙과 충돌하므로 제거한다.

정정 후에는 **Journey Workspace의 action-first 교정안**을 사용자에게 추천할 수 있다. 현재 판정은 조건부 구현 승인이 아니며, 이 보고서만으로 `APPROVE_FOR_PRESET_GATE`로 자동 승격하지 않는다. Codex가 정정된 단일 프리셋과 실제 미결정 경계를 제시해야 한다.

후속 문서 작업은 선행 리뷰 원문을 고치는 대신 `design/redesign-v2/`의 별도 프리셋 산출물로 종합하는 것을 권고한다. Codex가 §1 정정 반영 여부와 §7 차단 단계의 명시 여부를 확인해 제출 준비를 판단한다. 디자인 승인자는 사용자다. 이 보고서의 판정 기록은 그대로 두며 모델의 추가 동의만으로 구현 권한을 만들지 않는다.

## 2. 중요 주장 근거표

소스 약칭: `web/` = `apps/web/src/`, `client/` = `packages/api-client/src/`. 문서 약칭: F=FORENSICS, P=PRESERVE-KILL-QUESTION, G=GEMINI-DIRECTIONS, K=KIMI-SENIOR-REVIEW, A=이전 Astra proposal, L=이전 GLM report. 앞의 네 문서는 이 문서와 같은 디렉터리, 뒤의 두 문서는 지정된 `frontend-weirdness-audit/.design-advice/`에 있다.

| 중요한 주장 | 분류 | 직접 근거와 판정 |
|---|---|---|
| Home의 Project Run과 legacy Roadmap empty가 경쟁한다 | verified / 영향은 inference | `web/app/(myroadmap)/myroadmap/page.tsx:175-189`이 두 목록을 함께 렌더링한다. 혼란의 크기는 이번 사용자 실험으로 측정하지 않았다. F의 구조 진단은 타당하다. |
| 상세는 공통 셸을 잃고 네 동급 surface를 노출한다 | verified | `web/app/projects/[runId]/page.tsx:34-40`은 독립 main, `project-run-workspace.tsx:88-145`는 map/linear/focus/proof 탭이다. |
| 기본 면이 운영자 콘솔 어휘를 노출한다 | verified | `project-run-focus-view.tsx:112-136,277-346`의 ID·projection·명령과 `target-entry-wizard.tsx:583-594`의 Phase 2·WorkflowOperation·Retry-After. |
| 현행 dark 배경이 pure black이다 | verified | `web/app/globals.css:157-201`: background `#000000`, surface `#0a0a0a`, raised `#141414`. 밝은 차콜이 편안하다는 방향은 사용자 요구이며 피로 감소 효과는 미검증이다. |
| Create 내부 단계는 정확히 11개다 | verified | wizard `:72-83`. 그러나 11개의 동일한 사용자 결정이 있다는 뜻은 아니다. profile/diff 확인을 자동 통과시키는 “3단계화”는 허용하지 않는다. |
| URL 또는 자유로운 직무 텍스트로 목표를 만든다 | verified 일부 / unsupported 일부 | wizard `:292-315`는 URL 또는 `MANUAL_CAPTURE.sourceText`인 **공고 본문**이다. G A의 “직무 텍스트 입력”, C의 자유 직무 설계는 같은 계약이라고 입증되지 않았다. |
| 프로젝트 추천은 2~3개면 된다 | unsupported | G A의 표현. 현행 wizard `:668-680`은 세 제안 비교를 설명한다. 화면 압축을 이유로 서버 cardinality나 사용자의 비교 선택권을 변경하지 않는다. |
| 저장소 신규 생성/포크를 제공한다 | contradicted | `client/career-v1.ts:107-111`의 모드는 EXISTING_OWNED / OPEN_SOURCE_CONTRIBUTION / MANUAL_GREENFIELD. 이 모드가 생성·fork API를 뜻하지 않는다. K의 기각은 맞다. |
| 노드별 시간·난이도를 proposal에서 매핑하면 된다 | unsupported | `client/schema.generated.ts:1985-1999` task에는 해당 필드가 없다. `client/career-v1.ts:70-85`의 durationHours/difficulty는 proposal 수준. 사용자 승인이 총량을 task 추정치로 바꾸는 근거가 될 수 없다. |
| 보관하기 버튼을 추가해도 된다 | unsupported | G A `:86`. `use-project-run-commands.ts:110-120`에는 archive/restore 명령이 없다. ARCHIVED 조회 상태가 mutation 능력의 증거는 아니다. |
| React Flow는 이미 키보드 지원이 완성됐다 / 단지 tabIndex만 있다 | unsupported / contradicted | 캔버스 `:208-218`에 Enter/Space 선택 핸들러가 실제로 있다. 따라서 K의 “tabIndex만”은 부정확하다. 방향키 논리 순서·중복 focus·화면 밖 node 접근은 런타임 미검증이다. 전부 미구현 또는 전부 완료라고 단정하지 않는다. |
| 재사용하면 리스크가 최저이고 API 변경 0건으로 모든 여정이 해결된다 | inference / unsupported | Focus와 map rail은 존재하지만 내부 레이아웃과 상태 소유가 다르다. 공개 ID 연결·scope 지속성은 별도 계약 공백이다. K `:190-192`의 “유일·검증된 최저·전환 비용 소멸”은 근거 없는 비교 결론이다. |
| 모든 명령은 409에서 자동 refresh한다 | contradicted | command hook `:42-50`은 version/idempotency와 409 refresh를 구현한다. 그러나 publish/unpublish/reverify `:97-107`에는 `onError: afterError`가 없고 AI help에도 없다. 서버 가드의 실제 동작은 이 코드만으로 검증하지 않았다. |
| idempotency 헤더가 중복 클릭 방지까지 보장한다 | unsupported | hook `:42`는 호출마다 새 UUID를 만든다. 헤더 보존은 필수지만 중복 UI 명령 차단·실패 후 결과 재조회까지 증명하지 않는다. 자동 재전송을 새 UX 기능으로 추가하지 않는다. |
| FocusView 안에 PR 바인딩까지 이미 있다 | contradicted | K preset preserve `:87`. hook에는 bind가 있으나 실제 폼은 `project-run-proof-view.tsx:215-273`에 있다. Focus 재배치만으로 입력 동선이 해결되지 않는다. |
| run 공개와 profile 공개에는 서로 다른 상태와 갱신 의미가 있다 | verified | run DTO `:2022-2074`; `web/api/proof-profile.ts:32-48,188-212,297-324`는 missionId, publication state, validUntil, publish/renew/unpublish를 갖는다. 단순 토글 두 개라는 G의 설명은 부족하다. |
| 위 세 층은 같은 프로젝트를 가리키는 통합 공개 파이프라인이다 | unsupported | profile publication API는 **missionId**를 받는다. runId→missionId→publicProofId→profile publicId 연결이 읽은 계약에 없다. K의 “3층을 구분”은 필요하지만 연결 입증을 대체하지 못한다. |
| run publication publicId로 `/proof/[publicId]` 링크를 만들 수 있다 | unsupported | `/proof`는 `getPublicProofProfile`로 `/career/proof-profiles/{id}`를 읽는다. run publicId의 canonical resource 종류/href는 입증되지 않았다. null 확인만으로 해결하지 않는다. |
| fixture PASS를 공개 GitHub 증명으로 보여 줄 수 있다 | contradicted | run facts는 fixture/github 둘 다 허용하지만 `web/api/proof-profile.ts:138-154` public parser는 GITHUB/VERIFIED만 허용한다. fixture를 GITHUB로 재표기하지 않는다. |
| 공개 독자는 실제 PR·상세 조건·검증 한계까지 이미 볼 수 있다 | unsupported | public DTO `:6-30`에는 집계 수·조건 유형·검증 시점은 있지만 PR URL, SHA, 개별 평가 내용은 없다. owner의 풍부한 사실을 public으로 그대로 내보내겠다는 약속은 금지한다. |
| 프로젝트 설명 저장은 해당 프로젝트만 바꾼다 | contradicted | Proof view `:101-107,146-158`은 run summary에서 읽고 계정 전체 profile summary에 저장한다. A가 지적한 소유 범위 문제는 현재도 존재한다. |
| 모든 task가 Journey에 남는다 | contradicted | nullable milestone은 DTO가 허용하지만 adapter `:65-69`가 제거한다. 이번 실행: 입력 1개 → model 0개, currentTaskId는 남음. 지도뿐 아니라 model 기반 액션 패널도 잃는다. |
| 마지막 Proof node는 공개 가능 상태를 정직하게 보여 준다 | contradicted | layout `:161-172`는 모든 task DONE으로 doneCount 결정, ProofNode `:156-192`는 이를 “발행 가능”에 사용. 빈 목록 smoke에서도 doneCount=1이었다. 실제 proof PASS·출처·공개 조건과 별개다. |
| green 숫자는 task별 검증 완료를 입증한다 | unsupported | adapter `:55-62`는 전역 `rule-N`을 각 task의 동일 index에 붙인다. Proof view `:27-41`도 숫자 suffix로 여러 task에 연결한다. A G3를 유지하며 안정된 귀속 없이 수치를 강조하지 않는다. |
| Home→Create→Detail에서 제목·범위·비목표가 유지된다 | unsupported | proposal에는 있지만 run.plan DTO `:1954-1958`는 id/schemaVersion/provenance뿐. target 회사/직무는 선택한 project title과 다르다. A G4는 미해결이다. |
| 생성 전 새로고침·다른 기기 재개가 된다 | unsupported | wizard `:117-145`는 React state 보유. `:266-273`의 import repositoryIds `[]` 의미도 UI가 전체 분석 동의로 해석하면 안 된다. A G5와 import scope 확인을 유지한다. |
| 이전 GLM exemplar는 현재 redesign의 검증 근거다 | contradicted | audit source에서 일부 구현은 확인했으나 현재 workspace는 여전히 4탭. L `:95`도 390/1440 light/dark 실측 미수행을 명시한다. L의 test/build 통과는 **이전 보고 기록**, 이번 재검증 결과가 아니다. |
| Journey Workspace가 가장 사용자 친화적이다 | inference / user decision | 구성상 가능한 후보다. 사용자 요구 충족은 조건부이며 비교 사용성 실험은 없다. 선행 모델의 동의를 독립 검증으로 세지 않는다. |

### 선행 문서별 채택 범위

- **F:** 구조 진단 채택. “모든 주행동이 나쁘다”는 일반화 금지. 기존 Home의 상태별 CTA 분기는 보존할 재료다.
- **P:** domain·guard·fixture 보존 채택. “원하는 것을 공유한다”는 종착점은 현재 기능 완료 사실이 아니라 목표로 표시해야 한다. API 문제를 사용자 취향 질문에 넣지 않는다.
- **G:** 세 구조 대안과 charcoal 출발값만 후보로 채택. 자동 저장소 생성/fork, 노드 시간·난이도, verify 보편 CTA, 자유 직무 생성, archive, 자동 공개와 역량 인증 약속은 제거한다.
- **K:** A의 외부 실행 패널과 모바일 선형 경로 추천은 채택. B 불가·A 유일·재사용 최저 리스크·all-command refresh·publicId 충분조건·패널 없는 실행 기준은 채택하지 않는다.
- **A:** 단어집, 실행/검증/공개 축 분리, URL intent 우선, 계정 편집 분리, G1~G6, 실제 외부 독자 검증을 채택한다. 이전의 3개 내부 목적지나 목록 기본을 이번 프리셋의 승인된 결정으로 승계하지 않는다.
- **L:** PR 누락·저장소 누락·pending·저장 보기 이관에서 배운 경계를 채택한다. 이전 승인 receipt나 테스트 수를 새 프리셋 승인/시각 증거로 재사용하지 않는다. “내 프로젝트에서 확인”은 안전한 탈출구지만 저장소 문제를 고치는 복구가 아니다.

## 3. Journey Workspace 선택과 가장 강한 반론

**선택할 수 있다. 단, “큰 지도 옆 작업 콘솔”이 아니라 “작업 중심, 여정 동기화”로 선택한다.**

채택 이유는 두 가지다. 사용자는 같은 프로젝트 안에서 현재 작업과 선행 관계를 함께 확인할 수 있고, 지도 노드와 접근 가능한 목록이 하나의 선택 상태를 공유하면 네 개의 표현 방식을 목적지로 학습할 필요가 줄어든다. 둘 다 설계상의 추론이며 아직 사용성 결과가 아니다.

**가장 강한 반론:** 이번 실패의 원인은 내부 시스템 구조가 사용자의 작업보다 앞선 것이다. 왼쪽 60% 캔버스, 오른쪽 좁은 실행 패널, 위쪽 hero, 별도 proof 모드를 만들면 그 원인을 다른 컴포넌트로 재현한다. 특히 현재 Focus는 자체 2열(`lg:grid-cols-[minmax(0,1fr)_320px]`), Map은 자체 DetailRail을 가진다. 둘을 그대로 삽입하면 중복 rail과 조작 표면만 늘어난다. “모두 구현돼 있으므로 조립만”은 위험한 발주 문구다.

교정된 방향의 불변 조건:

- 첫 읽기 순서: 프로젝트 식별 → **현재 작업 제목·목적 → 완료 기준 → 연결할 근거와 행동**. 지도 컨트롤이나 검증 로그가 먼저 나오지 않는다.
- 데스크톱 지도는 필요한 관계를 읽을 크기로 보여 준다. 패널 최소 가독폭이 깨지면 비율을 조절하거나 선형으로 쌓는다. 상시 60% 점유 의무는 없다.
- 모바일은 단일 열 작업 본문 + 선형 여정. `지도 보기`로 같은 React Flow를 열 수 있지만 기본 업무의 입장권은 아니다.
- 지도는 실제 prerequisite·현재 task·필수/선택·완료/차단 상태를 설명한다. 경로 강조는 “현재 작업과 관련된 작업”이지 유일한 정답 경로나 최단 완료 시간 예측이 아니다.
- `현재 작업`과 `살펴보는 작업`을 별도로 표시한다. task 선택은 server current 변경이나 start/resume를 발행하지 않는다.
- 작업 증명은 끝나야만 발견되는 잠긴 트로피가 아니다. `작업 증명 보기`라는 일반 링크/버튼으로 진행 중에도 상태를 확인한다. 열기/닫기와 브라우저 복귀 의미를 갖지만 네 가지 기술 surface를 peer 탭으로 부활시키지 않는다.

**정당한 경쟁안:** K의 Preset 2, 즉 실행 문서 + 읽을 수 있는 상시 지도 레일도 요구를 충족할 수 있다. “작으면 장식”이라는 판정은 틀렸다. 반대로 중요한 관계를 읽을 수 없는 축소 그림이면 실패다. 사용자가 A에서 다음 행동을 못 찾거나 지도를 장식으로 읽으면 이 경쟁안을 다시 검토한다. C의 공간 탐험/semantic zoom 주도는 현재 목표에 불필요하므로 추천하지 않는다.

## 4. 회귀 방지 keep / kill 규칙

| Keep: 반드시 남길 것 | Kill: 발견하면 프리셋 위반 |
|---|---|
| Project/task/proof 데이터, read-only 계획, 서버 current/recommended/eligible·version·idempotency 계약 | client가 DONE·공개·새 current를 확정하거나 task 선택만으로 명령을 보내는 행동 |
| React Flow 엔진과 실 선행 관계. 전체 task의 접근 가능한 목록 | 엔진 보존을 이유로 누락 adapter·잘못된 Proof 준비 계산까지 그대로 유지; 조작해야만 도달하는 업무 |
| 같은 task 선택을 공유하는 지도·본문·목록, 명시적 intent 우선 | 네 peer 탭을 아이콘이나 다른 이름으로 재도입; 저장된 map/proof가 Home CTA를 덮음 |
| 한 현재 맥락의 주행동 **최대 하나**. 기다리는 상태는 행동 대신 status 가능 | 시작·보류·재개·검증·발행을 한 rail에 나열; sticky와 inline을 동시에 두 개의 독립 primary로 노출 |
| 프로젝트 목록과 legacy 콘텐츠의 데이터·직접 URL | Home의 서로 다른 empty 혼합, legacy 데이터 삭제·자동 run 변환, 현재 메뉴를 이름만 바꿔 그대로 보존 |
| 사용자 언어 오류, 원인·입력 보존·실제 해결/탈출 경로 | “최신 projection을 받으세요”, raw 오류를 그대로 표시, 막힘 원인 대신 무조건 재개 |
| source/fixture 표식, 확인 범위·시점, 작성자 설명과 확인 사실 구분 | fixture/provenance 전체를 진단에 숨김; 검증 통과를 역량 인증·취업 준비도·성공 확률로 확대 |
| 계정 소개는 계정 범위로, project summary는 확인된 저장 범위로 | run 문맥에서 계정 전체 summary를 프로젝트 설명처럼 저장 |
| 사용자 검토·비목표·공개 대상 선택 | 3단계 표시를 위해 profile/diff confirm 자동 승인; 초록 완료와 동시 공개 |
| Wanted Sans·기존 UI primitives·시맨틱 토큰·light/dark | 새 병렬 토큰 라이브러리, 화면별 slate/hex 스타일, pure-black 앱 배경, glass·neon·confetti·장식 모션 |
| 완료·선택·잠금·현재를 텍스트와 구조로 구분 | 잠긴 노드 전체 opacity를 낮춰 제목·선행 조건까지 읽지 못하게 함; 단계 번호로 병렬 작업의 필수 순서를 발명 |
| 코드는 실제 코드, PR·저장소는 실제 작업 대상 | 기본면의 UUID/projection/receipt/원시 enum; 가짜 repo/PR 링크; 조작 가능한 편집기처럼 보이는 read-only 노드 |

“탭을 없앴다”, “검은색을 바꿨다”, “solid 버튼이 하나다”만으로 통과하지 않는다. 잘못된 행동 하나만 남은 화면도 실패다.

## 5. 스트레스 테스트 계약

아래는 **향후 승인 후 실행할 acceptance scenarios**다. 이번에 통과했다고 보고하는 목록이 아니다. 서버가 실제로 발생시키는 상태와 프레젠테이션 경계 입력을 구분하고, 후자의 결과를 실 provider 증거로 세지 않는다.

### 5.1 React Flow: 데스크톱·모바일·키보드

| 공격 시나리오 | 반드시 관찰할 결과 |
|---|---|
| 1440px에서 처음 진입, 긴 한국어 작업명·완료 기준 | 현재 작업과 다음 행동이 위계상 먼저 읽힌다. 지도와 패널 각각 안에 별도 상세 rail/명령 column이 생기지 않는다. 노드 제목·상태가 tooltip에만 있지 않다. |
| 1024px 근처, 390px/320 CSS px, 200% 텍스트 확대 | 60:40을 지키느라 본문을 압착하지 않는다. 단일 열 경로에 같은 작업·선행 조건·행동이 있고, 문서 가로 스크롤·잘림이 없다. 캔버스 내부 공간 탐색과 문서 reflow를 구분한다. |
| 마우스 없이 앱 진입→다른 작업 보기→현재 작업 복귀→PR 입력→확인 요청 | 지도 진입 없이 일반 링크·버튼·폼만으로 완결한다. 지도 영역을 건너뛸 수 있고, 모든 node를 Tab으로 통과해야 본문에 닿는 구조가 아니다. |
| 지도 키보드 선택, 노드가 화면 밖/접힌 milestone/필터 제외 상태 | 키보드로 도달한 항목을 실제로 볼 수 있다. 중복 node wrapper/inner focus, trap, 숨은 선택이 없다. 방향키를 광고하면 실제 논리 순서대로 작동함을 증명한다. 일반 버튼 동작만 구현했다면 그 이상을 약속하지 않는다. |
| DONE·LOCKED·선택 작업·현재 task가 서로 다름 | 선택 강조와 현재 표시가 혼동되지 않는다. LOCKED 이유는 읽을 수 있고 선행 작업으로 이동한다. 명시적 `현재 작업으로 돌아가기`가 선택·필터/접힘을 설명 가능하게 해결한다. |
| 병렬 prerequisite·선택 task·milestone 없는 task·빈 milestone·빈 task 목록 | 모든 계약상 task가 목록/본문에서 도달 가능하다. 합쳐진 그룹이 필수 의존관계를 바꾸지 않는다. 빈 계획은 완료·발행 가능이 아니고 좌표는 유한하다. 정의되지 않은 단계명·소요 시간을 발명하지 않는다. |
| 모바일 지도 열기/닫기, 키보드 표시, 회전 | 명시적인 닫기와 원래 본문/초안/focus 복귀. 고정 navigation·Next Action·safe area·가상 키보드가 충돌하지 않는다. 기본은 inline CTA이며 sticky는 가림이 없을 때만 같은 행동의 대체 표현으로 쓴다. |
| 명시적 fit/current 요청과 백그라운드 refresh | 사용자 요청에만 카메라를 움직이고 reduced motion에서는 즉시 이동. polling·결과 도착·단순 선택이 자동 pan이나 focus 탈취를 하지 않는다. |

한 데이터/행동 계약을 공유하는 두 표현이다. “모바일 fallback”을 오래된 덜 완성된 별도 제품으로 두지 않는다. 반대로 모든 노드 안에 명령 폼을 복제할 필요도 없다.

### 5.2 상태와 주행동

**우선순위:** 세션/권한 → run 읽기 전용 상태 → 최신 서버 상태 확보 → 같은 run의 충돌 pending → 현재 실행 대상과 선택 대상 → task 상태·근거 조건. 이 순서를 통과한 뒤 아래 행동을 고른다. 현재 client의 UI 분기를 서버가 허용하는 행동 목록으로 오인하지 않는다.

| 상태/조건 | 주행동과 경계 |
|---|---|
| 세션 만료/권한 없음/최초 조회 실패 | 로그인 복구·권한 안내·재조회 중 실제 가능한 하나. private 데이터나 권한 없는 액션을 노출하지 않고 입력 의도를 보존한다. |
| ARCHIVED 또는 완료 run에 모순되는 editable task | 기록/작업 증명 읽기. task enum만 보고 start/resume를 노출하지 않는다. 모순은 최신 상태 확인 후 설명하며 복원/삭제를 발명하지 않는다. |
| READY, eligible이며 현재 다른 작업과 충돌하지 않음 | `작업 시작`. eligibleReadyTaskIds가 있으면 권위로 사용한다. 현재 다른 작업이 있으면 보류 등 서버가 요구하는 선행 절차를 먼저 설명한다. |
| IN_PROGRESS, 저장소 바인딩 없음 | 검증·PR 연결 가능처럼 보이지 않게 이유와 실제 존재하는 탈출/지원 경로. 목록으로 돌아가는 것은 복구 성공이 아니다. |
| IN_PROGRESS, 저장소 있음 / PR 없음 | `PR 연결하기`. 작업 문맥의 실제 폼으로 이동/확장한다. 기존 repository ID는 내부 값으로 전달하고 사용자가 숫자 ID를 찾아 입력하게 하지 않는다. URL→PR 자동 해석/검색을 새 기능처럼 약속하지 않는다. |
| IN_PROGRESS, PR 있음 | `결과 확인 요청`. 단순히 PR 번호가 있다는 것과 권한/관측 가능한 PR이라는 것은 구분한다. 서버 거절 시 그 입력 근처에서 보완한다. |
| BLOCKED | 알려진 이유와 `해결 방법 확인`; 조건 해소 후 재개. verificationFailure를 모든 사용자 blockNote의 readback으로 주장하지 않는다. 사유가 없으면 없음을 말한다. |
| DEFERRED | 서버 조건에 맞는 `작업 재개`. 다른 current 작업을 몰래 교체하지 않는다. |
| VERIFYING 또는 충돌하는 pending operation | `결과 확인 중` status. 충돌 mutation은 잠그고 읽기·나가기·원본 확인은 유지. pending이 PR binding인지 proof reverify인지에 맞게 설명한다. |
| DONE | 다음 유효 작업이 있으면 `다음 작업 보기`, 없으면 `작업 증명 확인`. 자동 start/publish 금지. |
| LOCKED | `선행 작업 보기`. 잠금 원인을 이름으로 설명하며 시작 버튼은 없음. |
| 409/전송 결과 불명/일시 오류 | 최신 상태·operation을 먼저 확인하고 초안/선택 보존. 동일 의미인지 확인 전 mutation 자동 재실행 금지. 서버가 요청을 받았는지 모르는 실패를 “실행되지 않음”으로 단정하지 않는다. |

빠른 두 번 클릭, Enter 반복, 다른 task로 이동한 직후 응답 도착, AI 도움 요청 중 current 변경을 포함한다. **이전 task의 질문·막힘 메모·오류가 새 task의 입력으로 재사용되지 않아야 한다.** 결과 귀속은 요청 대상에 남는다. run-level PR binding 변경 역시 “선택 task 하나만 변경”이라고 표시하지 않는다.

### 5.3 다크 토큰 전략

기존 `background/surface/surface-raised`, `foreground/muted-foreground`, `primary/*`, `success/warning/error/*`, `border/input/ring`을 유지한다. 색상 역할을 먼저 고정하고 값은 토큰 정의에서만 변경한다. 검정 금지는 앱의 배경·작업 면에 적용하며 dark 버튼 위 어두운 글자나 스크림까지 기계적으로 금지하는 규칙으로 확대하지 않는다.

권장 출발점은 G A의 `#111215 / #181a20 / #22252e`, 기본 본문 `#f3f4f6`, 보조 본문 `#9ca3af`다. **편안함·AA를 이미 검증한 팔레트가 아니다.** 현재 상태색 세트를 우선 유지하고 각 역할에서 측정한다. 전체 배경을 순수 검정으로 되돌리거나 본문을 저대비 회색으로 숨겨 실패를 덮지 않는다.

이번 sRGB 상대휘도 계산 결과:

| 전경 / 배경 | 계산 대비 | 해석 |
|---|---:|---|
| `#f3f4f6 / #22252e` | 13.9072:1 | 일반 텍스트 최소 기준을 넘는 후보 |
| `#9ca3af / #22252e` | 6.0284:1 | 보조 텍스트 최소 기준을 넘는 후보 |
| `#3b82f6 / #22252e` | 4.1614:1 | G의 진행색을 작은 텍스트로 쓰면 4.5:1 미달. 선/아이콘 역할과 텍스트 역할을 구분 |
| `#2c303b / #22252e` | 1.1610:1 | 유일한 입력 경계·선택 표시·의미 있는 연결선으로 쓰기에 부족 |
| `#2c303b / #111215` | 1.4208:1 | 위와 같음 |
| `#22252e / #111215` | 1.2238:1 | 면 색 차이만으로 control/선택을 식별하게 하지 않음 |

W3C 기준은 [일반 텍스트 4.5:1, 큰 텍스트 3:1](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [필수 UI 식별/상태/그래픽 3:1](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)이다. **모든 장식 border가 4.5:1이어야 한다는 G의 문장은 틀렸다.** 약한 divider는 가능하나 의미 있는 edge·focus·input은 충분한 대비가 있어야 한다. 잠긴 task도 읽고 선행 관계를 확인하는 콘텐츠이므로 전체 opacity로 숨기지 않는다.

실제 QA에서는 light/dark 각각 default/hover/focus/pressed/error/selected/subtle 표면 위 조합, alpha 합성 후 색, React Flow 기본 controls·background·node 상태까지 확인한다. component hex 0개는 충분조건이 아니다. 공개 페이지의 `bg-slate-950` 등 비시맨틱 클래스도 rollout 시 정렬 대상이다. 현재 공개 페이지까지 일치한다고 주장하지 않는다.

### 5.4 Home / Create / Detail / Proof 연속성

| 경로 | 공격 입력 | 통과 기준 |
|---|---|---|
| Home → Detail | 여러 ACTIVE run, 같은 회사/직무, cursor 뒤에 추가 run | “최우선”을 추측하지 않는다. 로드한 목록 중 current/eligible 등 설명 가능한 기준을 사용하고 다른 프로젝트 접근을 유지한다. updatedAt은 최근 작업 시각이 아니라 갱신 시각으로 표시한다. 같은 목표·저장소 run을 구분할 정보가 부족하면 부족함을 숨기지 않는다. |
| Home 목록 | initial loading/error, 추가 페이지 실패, 완료만 있음, legacy만 있음 | empty/loading/error 분리. 완료만 있으면 다음 task를 발명하지 않는다. legacy 실패가 run 목록을 가리지 않는다. 전체 검색·전체 개수·전역 우선순위를 부분 페이지에서 주장하지 않는다. |
| 생성 CTA → Create | Home·글로벌 nav·기존 `/create` 진입 | 프로젝트 생성 행동은 `/projects/new`로 간다. legacy 생성은 구별된 문맥에 남는다. flag가 꺼진 기능을 정상 생성인 것처럼 유도하지 않는다. |
| Create | URL 수집 실패·공고 본문 붙여넣기·증거 없음·권한 거절 | 입력 보존, 원문과 추출 구분, 분석 대상 동의 범위 명확화. “근거 없음”은 역량 없음이 아니다. `MANUAL_GREENFIELD`/오픈소스 모드가 실제 실행·검증까지 이어진다는 증거 없이는 시작 가능을 보장하지 않는다. |
| Create의 세 사용자 단계 | profile/diff 정정, 이전 결정 변경, proposal 실패, 취소 요청 | 확인 권리와 서버 순차 계약 유지. downstream 무효화 설명. 실제 단계만 표시하고 가짜 percentage/ETA 없음. 취소 요청 접수와 완료를 구분한다. 생성 전 영속 재개는 지원 범위 이상 약속하지 않는다. |
| Create → Detail → 재방문 | 선택 proposal의 title/boundedOutcome/nonGoals | 조회 가능한 같은 서버 근거로 이어진다. target 직무를 프로젝트 제목으로 위장하거나 브라우저 임시값으로 기기 간 scope 지속을 보장하지 않는다. 계약 공백이면 exemplar의 한계로 표시하고 전체 연속성 완료를 막는다. |
| task deep link / Home CTA / 새로고침 | 저장된 Proof·map·필터, invalid task, 다른 plan | 명시적 URL intent → 해당 진입 CTA intent → 최신 current/recommended → 유효한 보기 선호 순서. invalid task는 명시적 오류와 현재 작업 링크. 서버 변경이 초안·focus를 덮지 않는다. |
| Detail ↔ Proof / browser Back | 지도에서 여러 선택 후 Proof 열기·뒤로 가기 | node 탐색 선택은 replace 가능하되 작업 증명 열기/닫기 같은 명시적 목적지 이동은 뒤로 가기가 복원할 수 있는 URL 의미를 정한다. 현행 replaceState만으로 history 지원 완료라고 하지 않는다. |
| 완료 → Proof → 작업 복귀 | 완료 task, 아직 없는 proof, FAIL/STALE | 완료 결과를 확인하고 부족한 정확한 작업/입력으로 돌아간다. 마지막 node가 유일한 진입점이 아니며 원래 선택/스크롤/focus를 복원한다. |

### 5.5 공개 증명의 정직성

공개 완료를 판정하려면 아래 전체를 확인한다. **표시상 ACTIVE 하나로 대체할 수 없다.**

1. 정확한 resource 식별: run publication과 profile mission/publicProof/profile ID의 관계, 실제 canonical href, owner와 public DTO 구분. 관계를 모르면 링크를 추측하지 않는다.
2. 작업 완료·검증 PASS/FAIL/STALE·공개 ACTIVE/UNPUBLISHED/INVALIDATED·profile ENABLED/DISABLED·lease 만료를 별도 축으로 읽는다. `validUntil=null`을 영구 유효로 해석하지 않는다.
3. publish 응답 후 현재 public resource를 확인하고, 권한 없는 별도 독자가 읽는 내용까지 확인한다. owner 미리보기나 mock public fixture만으로 run→public 연결을 통과시키지 않는다.
4. profile ENABLED가 모든 증거 공개를 뜻하지 않고, run unpublish가 계정 전체 공개 철회를 뜻하지 않는다. **프로필 링크를 공유하면 다른 공개 결과도 함께 보일 수 있음**을 미리보기에서 알려야 한다.
5. 같은 owner에게 서로 다른 공개 결과가 두 개 있는 상태에서 하나만 공개/철회/갱신한다. 다른 결과·계정 소개·공개 주소가 의도치 않게 바뀌지 않는다. 대상 ID가 같다는 가정 없이 확인한다.
6. 공개 중 FAIL/STALE·lease 만료·profile DISABLED·권한 철회·요청 실패를 독자 경로에서 확인한다. 소유자에게 표시한 기존 공개 상태와 실제 응답의 차이를 숨기지 않는다. 이미 전달된 내용의 회수까지 보장하지 않는다.
7. 공개 DTO가 집계만 제공하면 “검증 기준 유형과 통과 수”라고 말한다. 개별 규칙·PR·커밋을 공개 화면에서 볼 수 있다고 쓰지 않는다. 구체적인 프로젝트 증명 제품 약속이 필요하면 공개 계약 보완이 gate다.
8. fixture는 실제 GitHub 증명과 분리한다. 현재 public 계약으로 fixture 공개가 안 되면 로컬 예시 열람까지만 가능하다고 표시하며 공유 경로는 **미검증/미완료**로 남긴다.

## 6. 기존 리뷰에서 빠졌거나 약화된 방향·흐름

아래의 “새 지적”은 이번에 받은 여섯 문서에 명시되지 않았다는 뜻이다. 모든 과거 프로젝트 검토를 검색했다는 주장은 아니다. A에 이미 있는 G1~G6를 새 발견으로 포장하지 않는다.

### 새 지적 A: “증명으로 끝나는 여정” 자체가 잘못된 완료 모델일 수 있다

공개는 완료 후의 선택이며 만료·재확인이 있는 반복 과정이다. 반면 G는 마지막 인증/트로피, K는 마지막 결과 패널로 압축한다. 현행 구현은 더 직접적으로 잘못된 상태를 만든다.

이번 실행은 현재 `adaptProjectRunProjection`와 `computeLayout`를 Bun 1.4.0에서 직접 import했다. 제품 파일·서버·데이터는 변경하지 않았다. 입력은 실제 run이 아니라 DTO 경계를 확인하기 위한 수동 구성 데이터다.

```text
scenario: empty-stage-no-proof
input: READY, tasks=[], proof=null, milestones=[empty stage]
output: proofDone=1, nonFiniteNodes=["m"]

scenario: nullable-milestone
input: tasks=[one READY/current task with milestoneId=null]
output: adaptedTaskCount=0, currentTaskId="ungrouped"
exit: 0
```

재현 방법은 위 기준 worktree에서 `bun -e`의 인수로 다음 JavaScript를 실행하는 것이다. 실제 실행과 같은 입력·함수·출력 항목이며 파일 생성이나 API 호출이 없다.

```javascript
import { adaptProjectRunProjection } from './apps/web/src/features/project-runs/projection/adapt-projection.ts';
import { computeLayout } from './apps/web/src/features/project-runs/projection/compute-layout.ts';
const run = {id:'review-only',state:'READY',version:1,currentTaskId:null,recommendedTaskId:null,plan:{id:'p',schemaVersion:1},milestones:[{id:'m',title:'Empty stage'}],map:{nodes:[],edges:[]},tasks:[],proof:null};
const graph = computeLayout(adaptProjectRunProjection(run), [], []);
console.log({proofDone:graph.nodes.find(n=>n.id==='proof')?.data.doneCount,nonFiniteNodes:graph.nodes.filter(n=>!Number.isFinite(n.position.x)||!Number.isFinite(n.position.y)).map(n=>n.id)});
const task = {id:'ungrouped',title:'Retained task',state:'READY',required:true,milestoneId:null,prerequisiteIds:[],purpose:'p',acceptanceCriteria:['c'],evidenceRequirements:[]};
const ungrouped = adaptProjectRunProjection({...run,milestones:[],tasks:[task],currentTaskId:task.id});
console.log({inputTaskCount:1,adaptedTaskCount:ungrouped.tasks.length,currentTaskId:ungrouped.currentTaskId});
```

빈 milestone 좌표 문제와 **빈 tasks가 공개 준비처럼 표시되는 계산**은 이전 문서에 없었다. 누락 task 자체는 A가 이미 지적했다. 공개 node의 준비 계산까지 이어지는 결과를 이번에 확인했다. 수정은 domain 변경이 아니라 잘못된 읽기 모델을 계약에 맞추는 일이다. “엔진·노드/엣지/레이아웃 전부 보존” 지시를 바꿔야 한다.

### 새 지적 B: 탐색 선택이 입력의 대상까지 바꾸는 순간

현 Focus는 `blockNote`, `aiQuestion`을 task별이 아닌 component state로 두고 선택 작업을 바꾼다(`project-run-focus-view.tsx:70-75`). 기존 탭형 UI에서도 위험하지만 상시 양방향 지도에서는 빈번해진다. **[INFERENCE]** A에 메모를 쓰다 B를 선택한 뒤 제출하면 A의 내용이 B에 붙거나 A의 응답이 B 문맥에서 읽힐 수 있다. 초안·pending·오류의 task 귀속을 명시하고 전환 후 전달 대상을 사용자가 알게 해야 한다. 이 문제를 두 개의 독립 실행 패널로 해결하지 않는다.

### 새 지적 C: “작업별 독립 PR 연결”이라고 부를 수 없는 run-level 변경

bind command는 run endpoint에 repositoryId/pullNumber를 보내며 taskId를 받지 않는다(`use-project-run-commands.ts:91-95`). 선택한 작업 옆으로 폼을 옮길 때 **이 프로젝트의 연결 PR을 바꾸는 것**임을 명시해야 한다. 여러 작업에 서로 다른 PR을 동시에 바인딩할 수 있다는 약속은 현재 계약으로 입증되지 않았다. 이미 확인한 facts의 PR/SHA와 새 binding의 PR을 구분하고 현재 task 하나의 변경처럼 보이지 않게 한다.

### 새 지적 D: 첫 공개 이후의 유지 관리 여정

K가 lease를 인식했지만 **다른 공개 결과가 있는 profile에서 특정 결과를 찾아 갱신/철회하고 다시 원래 프로젝트로 복귀하는 과정**은 설계하지 않았다. 특히 profile owner 항목은 missionId, 현재 product는 runId여서 단순 3층 UI로는 해당 결과를 찾을 수 없다. 공개 결과를 run에 귀속할 근거가 없으면 해당 링크를 만들지 않는다. 이 관계를 기술자가 조사할 일을 사용자 취향 질문으로 넘기지 않는다.

### 새 지적 E: 동기화된 두 표현의 DOM 정체성

현재 map TaskNode는 `id="task-${task.id}"`(`roadmap-map-canvas.tsx:208-213`), Focus article도 동일 ID를 쓴다(`project-run-focus-view.tsx:163-165`). 기존에는 surface가 교대로 mount되지만 A에서는 같이 mount될 수 있다. **[INFERENCE]** 무변경 조립 시 duplicate ID로 hash target/label/focus 목적지가 모호해진다. 복사한 작업 링크의 target은 본문 하나로 정하고 지도 DOM identity와 분리해야 한다. 이는 “재배치만”이라는 비용 주장에 대한 구체적 반례다.

### 빠진 구조 대안: action-first “프로젝트 작업 문서”

완료 기준과 현재 작업을 주 문서로 두고 React Flow를 읽을 수 있는 여정 레일로 배치하는 방향을 정식 경쟁안으로 취급해야 한다. K의 Preset 2에 일부 있지만 낮은 비용 대안으로만 남겼다. 핵심 질문은 브랜드가 지도 제품처럼 보이는지가 아니라 **지도가 어떤 실제 의존관계를 이해시키고, 그 뒤 어떤 정확한 행동으로 연결하는가**다. 더 큰 캔버스가 이 답을 개선하지 않으면 줄이는 것이 맞다.

## 7. 가장 작은 안전한 exemplar

**한 route: `/projects/[runId]`의 작업 중심 Journey Workspace. 한 개 정상 run과 같은 템플릿의 경계 상태.** 완료/오류/모바일을 새 화면 프로젝트로 늘리지 않는다.

### 승인 후 허용 범위

- AppShell 안의 상세 route, 현재 작업 본문, 실제 React Flow 여정, 동등한 일반 HTML task 목록/선택, 단일 상태 행동, 실제 기존 PR binding 폼의 작업 문맥 이동.
- selected/current/recommended의 분리와 task URL·Proof 열기/닫기의 최소 navigation 의미. 두 표면의 draft/error/DOM identity 정리.
- 같은 상세에서 읽는 최소 작업 증명 요약: 기존 run verification/publication/fixture/확인한 사실과 알려진 미연결 상태. 계정 소개를 project 입력처럼 저장하는 요소는 이 surface에서 제거한다.
- 동일 시맨틱 변수의 **해당 route 한정** charcoal 값 적용. AppShell을 포함한 exemplar 범위에만 닿게 하고 전역 `.dark` 배포 변경은 shared-shell rollout에서 따로 검증한다. 두 번째 토큰 체계는 만들지 않는다.
- nullable task 누락·빈 milestone·false Proof readiness 같은 필요한 프레젠테이션 정확성 수정. 서버 DTO나 상태 전이 의미는 바꾸지 않는다.
- 공유 adapter/layout을 고치면 기존 소비자의 회귀 검증은 범위에 포함한다. 다른 route의 IA·시각 변경까지 허용하는 것은 아니다. 토큰 override는 exemplar wrapper에 한정하고, 기존 root 토큰과 primitive의 전역 동작을 바꾸지 않는다.

### 이번 exemplar에서 제외

Home 재구성, Create 재작성, 전역 내비 개편, 계정 공개 프로필 편집/lease UI, public page 재설계, API 추가, 새 provider, 자동 repo/fork, 영속 생성 초안. 새 공개 링크를 발명하지 않는다. **이 제외는 exemplar 경계이지 전체 사용자 요구 삭제가 아니다.** Home/Create/Proof 연속성의 전체 완료 주장은 해당 rollout과 실제 계약 증거까지 보류한다.

### 차단 단계와 승인 책임

| 단계 | 필요한 근거 / 승인 | 미해결 사항 처리 |
|---|---|---|
| 프리셋 제출 준비 | Codex가 §1 다섯 정정과 이 범위표를 반영한 문서를 확인 | public mapping·scope 지속성은 해결 전이어도 명시적 제한과 차단 단계가 있으면 제출 가능 |
| exemplar 구현 착수 | 사용자 D1 승인 receipt: 선택 프리셋·한 route·허용 변경 범위. 구현자가 현재 명령/PR 계약을 확인 | 확인되지 않은 mutation을 추측해 구현하지 않음. 명확한 읽기·차단 상태는 구현 가능 |
| exemplar 실행/UX 통과 | §7 acceptance의 실제 앱 증거와 사용자 방향 재확인 | 정상 지원 경로의 start/bind/verify 결과가 확인되지 않으면 실행 통과 불가. public 링크 미연결을 정직하게 이해시키는 것은 가능하며 실제 공유 완료는 요구하지 않음 |
| 화면군 rollout | 해당 범위의 D2~D4 선택, 필요한 계약·exemplar 증거 | 상세 외 IA 변경은 별도 승인 범위에 있어야 함. public mapping 미입증은 공개 화면군을, scope 지속성 미입증은 완전한 Create→재진입 연속성 판정을 차단 |
| 전체 웹 출시 완료 주장 | 전체 연속성·실제 독자 경로·지원 provider 증거, D5 출시 범위 결정 | fixture UI 증거만으로 실 provider/공개 완료를 주장하지 않음. 미검증 항목을 제외하려면 사용자 명시 승인 필요 |

### rollout 전 필수 acceptance

1. **구조:** 상세의 네 peer 탭·raw-ID 제목·명령 rail 제거. 작업 제목/완료 기준/행동이 지도 컨트롤보다 우선한다. 중복 main·상세 rail·DOM ID 없음.
2. **실행:** 기존 API를 사용하는 READY→IN_PROGRESS→PR 미연결/연결→VERIFYING→결과 경로와 실패→보완→재확인을 실제 앱에서 확인한다. 위조 성공·노드 클릭에 따른 mutation·잘못된 PR/task 귀속 없음.
3. **상태 안전:** BLOCKED/DEFERRED/LOCKED/DONE, run ARCHIVED, conflicting pending, 버전 충돌, 결과 불명 실패를 해당 contract에 맞게 표시한다. 실제 발생시키지 못한 서버 상태는 fixture presentation 증거로만 기록한다.
4. **동기화:** map/list/detail이 같은 task를 읽되 current를 바꾸지 않는다. explicit task link가 저장된 보기보다 우선하고 invalid task는 명시적으로 안내한다. 다른 task 선택/refresh 후 초안·오류 귀속이 보존된다.
5. **모바일·키보드:** 390/1440 light/dark 캡처, 320 CSS px와 200% 텍스트 reflow, Tab/Enter/Space 전체 핵심 경로, 지도 열고 닫기/focus 복귀, 가상 키보드와 하단 막대 충돌 확인. 44×44 CSS px는 이번 프로젝트 조작 목표로 사용한다.
6. **지도 의미:** 별도 설명 없이 현재 위치·필수 선행 관계·다른 가능한 작업을 찾을 수 있다. optional/blocked/ungrouped/empty가 사라지거나 완료로 바뀌지 않는다. 지도 일부를 감춰도 core work가 완결되지만 지도가 있을 때는 실제 관계 정보가 추가돼야 한다.
7. **테마·정직성:** 위 대비 역할 기준과 장식 금지, fixture 표식, 작업 완료/확인 결과/공개 상태 분리. 아직 없는 canonical public destination은 “공유 완료”에 포함하지 않는다.
8. **독립 이해 확인:** 대상 사용자에게 화면 설명 없이 “지난번 하던 작업을 계속하고, 끝내려면 무엇이 필요한지 확인해 주세요”, “이 결과를 다른 사람에게 보여 주면 무엇이 보이나요?”를 준다. 첫 선택·멈춤·오해를 기록한다. 권장 기본 gate는 대상 개발자 5명 중 4명 이상이 무개입으로 실제 current 작업과 그 상태에 맞는 다음 행동을 찾는 것이다. 공개 범위 오해가 발견되면 수정 후 재확인한다. 이 수치는 D1 프리셋의 acceptance 기본값으로 함께 승인하거나 대체하며 통계적 효과·시장 적합성 증명이 아니다. public 링크가 미연결된 exemplar에서는 “아직 공유할 수 없다”는 정확한 이해가 정답이며 실제 공개 과업 완료와 구분한다.
9. **두 게이트:** 위 evidence receipt를 구조/접근성/시각/설계 의도로 분리하고, 사용자의 exemplar 방향 재확인을 받은 뒤에만 공통 셸→Home→Create→Proof/공개→long-tail로 확장한다. 실 public mapping 문제는 별도 gate로 남는다.

K의 “5초 내 식별”은 첫 인상 관찰 항목으로는 유용하나 단독 pass/fail 증거로 부족하다. 버튼을 5초 안에 봤지만 누르면 잘못된 PR/공개 대상에 작용한다면 실패다. 모델 Actor/Critic을 쓸 경우 별도 승인된 QA 절차를 따른다. 그 평가를 실제 대상 사용자의 이해로 대체하지 않는다.

## 8. 사용자에게 남은 정확한 결정

기술 사실·API 존재·mapping·안전 조건을 사용자가 승인으로 참으로 만들게 하지 않는다. 아래 제품 선택은 한 번에 제시하되 항목별 승인·보류·override를 기록한다. **D1만 승인하고 D2~D5를 보류해도 한-route exemplar는 진행할 수 있다.** D2~D5의 방향 동의는 해당 화면 구현·배포 권한을 자동 부여하지 않는다.

| ID / 결정 | 권장 기본값 | 승인 경계 |
|---|---|---|
| D1 프리셋과 exemplar 승인 | **action-first Journey Workspace**. 데스크톱 의미 있는 React Flow+작업 본문, 모바일 선형 업무+선택 지도. 고정 60:40·자동 pan 없음. §7의 한 route만 구현 | 정정된 프리셋·토큰 역할·범위가 제시된 뒤 명시적 사용자 승인. 기존 작업 노트 승인이나 이 판정을 receipt로 대체하지 않음 |
| D2 최상위 IA와 legacy 거처 | 실행 프로젝트를 주 제품으로 하고 `내 프로젝트 / 자료실`, 계정 접근을 명확하게. 기존 roadmap 편집/저장 데이터·직접 URL은 자료실 문맥에 보존 | 위치 변경 승인. 완전 폐기는 이번 범위에 넣지 않음. exemplar에서 기존 메뉴 전체를 먼저 바꾸지 않음 |
| D3 모바일 글로벌 navigation | rollout에서는 내 프로젝트·자료실 중심의 간결한 하단 navigation 유지, 계정은 명시적 접근. Create는 행동. 상세의 action은 inline 기본 | 하단 navigation + 별도 고정 action 두 겹은 금지. exact spacing/색은 기술 검증으로 정하며 별도 사용자 질문 아님 |
| D4 최초 공유의 단위 | 프로젝트 결과 하나를 확인하고 공유하는 intent, 계정 소개는 별도. 현재 유일하게 입증 가능한 목적지가 aggregate profile이면 “공개 프로필 공유”로 정확히 이름 붙이고 다른 공개 결과까지 미리보기 | 프로젝트 단독 public resource가 필수라면 그 계약 입증/보완 전 공개 rollout 차단. profile ID를 run 결과처럼 바꿔 쓰는 타협은 불가 |
| D5 최초 출시 대상과 생성 재개 범위 | 먼저 실제 지원이 입증된 GitHub 작업 경로. 실행 후 재진입은 필수. 생성 전 cross-device 영속 재개는 지원 안 함을 명시하고 별도 범위로 둘 것을 권고 | 초보자/저장소 없음 경로와 영속 생성 재개를 전체 release 범위에서 제외하려면 명시적 승인 필요. 이 보고서가 자동으로 범위를 줄이지 않음 |

**사용자 질문이 아닌 엔지니어링 확인:** run→mission→public resource mapping, public DTO 노출 범위, PR 바인딩 모드별 실행 가능성, `validUntil=null`, block note readback, proposal scope의 run 재조회 가능성. 먼저 현행 upstream 계약에서 확인하고 없으면 `jagalchi-api`의 제한된 계약 추가 제안으로 돌아온다. 임의 frontend 필드/로컬 저장소/가짜 링크로 채우지 않는다.

**이미 결정됐거나 기본값으로 처리할 것:** dark 유지·차콜로 밝게, React Flow 의미 유지, 모바일/키보드 canvas 비의존, raw console 정보 숨김, 장식 금지는 재질문하지 않는다. task별 시간/난이도는 증거 없으므로 제외한다. exact hex는 §5.3의 측정과 exemplar 시각 판단으로 조정한다. 프로젝트 이름 API를 지금 승인받지 않아도 exemplar는 사실인 target/저장소와 한계 표시로 가능하지만, 선택한 프로젝트의 지속되는 정체성·범위가 없으면 전체 여정 완료를 선언하지 못한다.

## 9. Codex에 대한 최종 권고

**Proceed with corrections.** 방향을 버리고 처음부터 다시 발산할 필요는 없다. 그러나 현재 Kimi preset을 그대로 승인받거나 GLM 결과를 합쳐 구현을 시작하는 것은 중지한다.

다음 액션은 하나다. **§1의 다섯 정정을 반영한 단일 action-first Journey Workspace 프리셋을 만들고, §8의 기본값과 §7의 한-route exemplar 범위를 묶어 사용자 preset gate에 제시하라.** 공개 연결·제목/범위 지속성 같은 미해결 계약은 분리된 차단 항목으로 표시한다. 승인 뒤 exemplar에서 다음 행동과 지도 의미를 동시에 증명하고, 그 결과가 반박하면 살아 있는 지도 레일을 가진 action-first 문서 방향으로 돌아간다.

### 증거·검토의 한계와 인계

- 현재 웹 소스와 생성 DTO가 **현재 기능 사실**의 기준이다. G/K/A는 서로 다른 제안, L은 별도 worktree의 구현 보고다. 이전 승인·이전 test count·모델 간 동의를 새 승인의 근거로 합산하지 않는다. 문서 간 상충은 위 표로 공개했으며 선행 산출물을 덮어쓰지 않았다.
- `factchk`: 중요 기능 주장에는 소스 위치를 붙였고, 대비 기준은 W3C를 확인했다. “차콜이 피로를 줄인다”, “A가 유일한 최저 리스크”, “B가 접근성 최고”는 검증 사실에서 제외했다.
- `mandela`: 선행 모델끼리 확인하는 shared hallucination, 직접 만든 fixture 성공을 제품 검증으로 세는 verifier=designer/tautology, “새 UI가 더 낫나”라는 frame injection을 배제한다. 이번 순수 함수 실행은 결함 경계 증거이며 UI 사용성 평가가 아니다. 실제 앱·권한 없는 독자·설명받지 않은 대상 사용자 관찰이 각 주장의 외부 증거다.
- `ssotize` audit-only: 상태/ID 사실은 생성 계약과 현재 소비 코드, 새 디자인 선택은 아직 미승인 프리셋이 권위다. “지도 중심성”, “공개 링크”, “프레젠테이션 보존”의 여러 문서 표현을 대조했고, 충돌은 본 판정에 남겼다. consolidation이나 기존 문서 변경은 하지 않았다.
- `sip / shower / re0`: 전체 문서만 전달한 무상태 cold-read를 실행했다. 승인 전 구현 금지와 다음 행동은 정확히 재구성됐고, 문서 편집 범위·게이트별 차단·미연결 공개 exemplar의 합격 의미가 불명확하다는 지적을 반영했다. 재현 입력과 실행 방법도 본문에 보강했다. 이는 문서 인계 점검이지 독립 UX 검증이 아니다.
- 구현이 없어 build/lint/test suite, browser visual QA, 배포 검증은 실행하지 않았다. HTML/CSS 화면이나 portable artifact를 만들지 않았으므로 anti-slop/detool은 해당 없음. 제품·서버·계정 mutation, commit/push/deploy는 수행하지 않았다.
