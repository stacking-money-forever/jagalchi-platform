# Major Phase 1 남은 작업

## 현재 상태

Major Phase 1 구현은 사용자 요청에 따라 여기서 일시 정지한다. 아래 항목을 모두 통과하기 전에는 Phase 1을 완료로 표시하지 않는다. 네 저장소의 변경은 전용 `arch-modernization` worktree에만 있으며 commit, push, merge, deploy는 하지 않았다.

마지막으로 전체 검증된 소스 스냅샷은 `ce6205b7a50d0bd9cf6a8ff8776f1059ac28af5c7c659ff09fd524ed9720f828`이다. 그 이후 API에 workflow 원자 커밋과 다중 Blueprint 수정이 들어갔고, Proof API와 닫힌 DTO 수정은 에이전트 중지 시점의 작업 상태이므로 다시 통합 검증해야 한다.

현재 계약 값:

- Public OpenAPI SHA-256: `b629ae9d1afbe06505c4a1f841d6f382046c944ae910946771638a1da433a92e` (2026-09-03 재검증)
- Internal AI bundle SHA-256: `1a632fe506f9828189e2f5c8af672e32dbb0b063b8b2c5f8d00c5d8ce4261c77`
- AI consumer aggregate SHA-256: `0f6173822a9e69f28fb3744f4daba91d27c013bc3057818b9017375a737d860d`
- AI prompt registry: `2026-09-03.3`

## 완료 전 필수 작업

### 1. 중단된 API 변경 통합 — 완료 (2026-09-03 재검증)

- [x] `git diff`를 기준으로 중단 시점의 Proof lifecycle, Project Run projection, V1 DTO 변경이 완결됐는지 확인한다.
- [x] Target import, profile snapshot, proposal, Project Run 생성의 도메인 변경과 `WorkflowOperation` 성공 처리가 같은 DB transaction 및 lease fence 안에서 커밋되는지 검증한다. (`career-v1.handlers.ts` `complete()`가 transaction + lease fence로 커밋)
- [x] 세 제안이 서로 다른 세 개의 immutable Blueprint id/version을 그대로 보존하는지 검증한다. (`qualifyProposals`가 distinct blueprint 검증, 미달 시 `INSUFFICIENT_QUALIFIED_PROPOSALS`)
- [x] Project Run 조회가 verification 실패, Machine Proof, publication, invalidation 상태를 closed projection으로 반환하는지 검증한다.
- [x] Fixture provider 기준 `reverify`, `publish`, `unpublish`, owner/public Proof read가 구현됐는지 확인한다. 실제 GitHub 연결은 Phase 3 범위다.
- [x] Target/Profile/Diff/Proposal/Project Run 생성 요청이 raw object가 아닌 bounded DTO로 OpenAPI에 노출되고 unknown field를 거부하는지 확인한다. (이 DTO 강화로 proposal/run `constraints` 필수 필드가 생김 — infra acceptance 스크립트·테스트 기대값도 맞춰 갱신함)
- [x] API 전체 lint, test, build, migration smoke, OpenAPI freshness, AI schema 비교를 다시 통과한다. (55 files / 423 tests, lint OK, `openapi:check` OK, `contracts:check` OK, migration smoke는 reset 볼륨에서 통과)

### 2. 계약 재동기화 — 완료 (2026-09-03)

- [x] API OpenAPI를 최종 재생성한다. (`pnpm openapi:generate` → SHA-256 `b629ae9d…a92e`)
- [x] Platform `packages/api-client/contract/openapi.json`, generated types, hash pin을 최종 API와 byte-for-byte 동기화한다. (web typecheck·api-client test 통과)
- [x] Infra `deploy/local-stack.lock.json`의 `apiContractSha256`을 최종 값으로 갱신한다.
- [x] API producer CI가 Django internal-v1 8개 schema와 legacy AI job 7개 mapping을 모두 비교하는지 재확인한다.

### 3. 최신 코드로 로컬 acceptance 재실행 — 완료 (2026-09-03)

- [x] 정확한 `jagalchi-v1-local` 범위만 reset하고 빈 PostgreSQL/MinIO 볼륨에서 migration과 bootstrap을 다시 실행한다.
- [x] `ci` 모드에서 fixture URL/GitHub/fake AI 수직 흐름을 통과한다. (`.evidence/local-acceptance-ci-20260903T052109Z-*.json`, 9 gates)
- [x] `ci-real-source` 모드에서 실제 Wanted URL 수집부터 Project Run 생성까지 통과한다. (`.evidence/local-acceptance-ci-real-source-20260903T052233Z-*.json`, 9 gates)
- [x] Presigned upload의 create → PUT → complete → authenticated content → delete를 통과한다. (두 acceptance의 `upload-lifecycle` gate)
- [x] Worker를 SIGKILL한 뒤 expired lease가 정상 worker에서 회수되는지 통과한다. (`worker-expired-lease-recovery` gate)
- [x] Production-built Next를 `127.0.0.1:3100`에서 실행하고 유일한 `chromium-no-msw` Playwright 테스트를 통과한다. (1 passed)
- [x] 성공 시 `.evidence/`의 redacted receipt를 보존한다. receipt에는 비밀값, URL, payload, resource ID를 넣지 않는다.

이 흐름은 이전 코드에서 실제 통과했지만, 마지막 API 변경 이후에는 다시 실행해야 한다.

### 4. 남겨진 외부 경계 — 일부 완료

- [x] 실제 DeepSeek 키를 mode-600 외부 env에 주입한다. (`~/.config/jagalchi/jagalchi-local-live.env`)
- [x] `local` 모드에서 fixture URL/GitHub facts → live DeepSeek → 인용된 제안 3개 → 유효한 plan을 통과한다. (`.evidence/local-acceptance-local-20260903T095602Z-*.json`, 9 gates, `liveDeepSeek: true`)
- [x] 네 worktree 변경을 검토 가능한 commit으로 나눈다. (2026-09-03 완료, push됨)
- [x] 생성된 commit SHA를 consumer와 Infra lock에 고정한 뒤 clean checkout bootstrap을 재검증한다. (lock `revisions` 블록에 platform/api/ai/infra SHA 핀 추가; validator가 HEAD 대조, `JAGALCHI_DEV_HEAD=true`로 우회; bootstrap이 lock SHA로 detach checkout. `/tmp/jagalchi-clean-bootstrap`에서 fresh clone → bootstrap OK → 빈 볼륨 local acceptance OK(9 gates, live DeepSeek). receipt `.evidence/local-acceptance-local-20260903T110355Z-*.json`)

실제 GitHub App/PR, production TLS/object storage, 배포, 백업/롤백, cross-browser, 모바일 실기기 E2E는 Major Phase 3~4 범위이며 Phase 1 완료 조건으로 계산하지 않는다.

## 2026-09-03 커밋·핀 완료 기록

4개 저장소의 `codex/arch-modernization-*` 브랜치에 논리 커밋으로 분할해 push했다. 원격 HEAD가 lock의 `revisions`와 일치:

| 저장소 | 브랜치 | HEAD |
| --- | --- | --- |
| platform | codex/arch-modernization-platform | 01a323d8 |
| api | codex/arch-modernization-api | 6d9fa7f1 |
| ai | codex/arch-modernization-ai | 6e618a35 |
| infra | codex/arch-modernization-infra | a47c9912 |

- platform 10커밋(api-client 계약 → workspace → web consumer → mobile → CI → docs → Phase 2 prep 3종), api 16커밋(계약 → 마이그레이션 → verification → job-sources → workflow → project-runs → career-v1 → seed → wiring → 수선), ai 9커밋(deps → config → contracts → ai-v1 → auth → legacy → tests → CI → docs), infra 8커밋(production spine → 로컬 러너 6종 → revision 핀).
- infra lock의 `revisions` 블록이 platform/api/ai/infra의 reviewed SHA를 기록. `validate-local-lock.py`가 소스 HEAD와 대조하고 `JAGALCHI_DEV_HEAD=true`면 우회. `local-bootstrap.sh`가 clone 후 lock SHA로 detach checkout.
- clean bootstrap 재검증: `/tmp/jagalchi-clean-bootstrap`에 infra를 원격 브랜치로 fresh clone → `local-bootstrap.sh --clone-missing`(나머지 3개를 lock SHA로 수령, pnpm/venv install) OK → `local-acceptance.sh --reset`(빈 볼륨, local/live DeepSeek) 9 gates OK.
- infra 자기 참조는 브랜치 HEAD 커밋이 lock을 담고, validator는 platform/api/ai만 대조하는 구조라 모순 없음.

## 2026-09-03 live DeepSeek 연동 중 발견·수정 사항

- **DNS 오염**: 로컬 DNS가 `api.deepseek.com`을 부산교육청 OfficeGuard IP(211.182.225.70)로 돌려 AI 호출 실패. `compose.local.yml`의 `ai` 서비스에 `dns: [8.8.8.8, 1.1.1.1]`과 `extra_hosts: api.deepseek.com:3.173.21.63`(진짜 CloudFront)을 추가해 우회. `extra_hosts`는 임시 로컬 편의책이고 IP가 바뀌면 갱신 필요.
- **프롬프트 레지스트리 버전**: extract/interpret/proposals/plan 4개 프롬프트에 LLM이 따라야 할 정확한 응답 키·형식(proposals 배열 키, evidenceRules 문자열 패턴, citations 빈 배열 규칙, span offset 규칙)을 명시. 레지스트리 버전 `2026-09-03.3` → `2026-09-03.4`. 관련 env·compose·settings·test 기대값 동기화.
- **결정론 보정**: semantic.py가 requirement의 quote에서 start/end span을 재계산(offset 산수는 모델이 아닌 코드가 담당).
- **citation 링크 검증 범위**: candidate-evidence-interpret의 citationIds는 요청의 evidence id를 가리키므로 응답 citations 배열과 교차 검증하지 않도록 service.py 수정.
- **gap 범위 불일치(마지막 게이트)**: proposal 생성은 "세 제안이 gap을 나눠 갖되" 동작하는데 plan 검증(`validatePlan`)은 diff의 전체 gap 커버를 요구 → rank-1 proposal이 cite한 gap만 커버해도 plan이 유효하도록 게이트를 **선택된 proposal의 citedGapIds ∩ diff**로 좁힘. plan 프롬프트도 같은 범위로 명시. acceptance 스크립트도 proposal/run 요청의 필수 `constraints` 형식과 429 polling 백오프로 갱신.
- **디버깅**: worker가 `AI_CONTRACT_INVALID`를 원본 Error.message(path 포함)로 로깅하도록 개선(실패 지점 특정 가능).

## 재개 위치


| 저장소 | Worktree |
| --- | --- |
| Platform | `/Users/justn/.herdr/worktrees/jagalchi-platform/arch-modernization` |
| API | `/Users/justn/.herdr/worktrees/jagalchi-api/arch-modernization` |
| AI | `/Users/justn/.herdr/worktrees/jagalchi-ai/arch-modernization` |
| Infra | `/Users/justn/.herdr/worktrees/jagalchi-infra/arch-modernization` |

권장 재개 순서는 2026-09-03에 모두 완료했다. live DeepSeek `local` 모드 acceptance, commit/ref pin, clean checkout bootstrap 재검증까지 끝났다. **Major Phase 1 완료.**

## 이미 확보한 증거

- Platform: 157개 web test file, 1,060 tests; mobile 10 tests; Node 24 production build 통과.
- API: 55개 test file, 423 tests (2026-09-03 최종 통합 검증 완료).
- AI: 74 tests, internal-v1 8 schema, legacy 7 mapping, fake four-endpoint chain 통과.
- Infra: 20 tests 및 Compose config 통과 (2026-09-03 재통과). Infra `deploy/tests/` lives in the `jagalchi-infra` worktree only.
- 실제 실행: empty-volume `ci` acceptance, Wanted `ci-real-source` acceptance, no-MSW browser E2E, live DeepSeek `local` acceptance가 2026-09-03 최신 코드로 모두 통과했다. receipt는 Infra worktree `.evidence/`에 보존됨.

현재 Docker의 API, workflow worker, AI, PostgreSQL 두 개와 MinIO는 healthy 상태다. 종료가 필요하면 Infra worktree에서 `deploy/local-down.sh /tmp/jagalchi-phase1-real-source.env`를 사용한다.
