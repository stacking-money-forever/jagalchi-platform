# Jagalchi platform deployment WIP

**STATUS:** Phase 2 10/18 | Platform lane | **완료:** embedded `services/*`, compose, deploy removed | **현재:** Vercel web + generated client only | **다음:** operator work in canonical repos

기준 시각: 2026-09-04

## Ownership (canonical)

| Surface | Repository | Operator entry |
| --- | --- | --- |
| Web (Vercel) | `jagalchi-platform` (`apps/web/vercel.json`) | `apps/web/docs/deployment.md` |
| Nest API + worker | `jagalchi-api` | GHCR `API_IMAGE` via `jagalchi-infra` |
| Django AI | `jagalchi-ai` | GHCR `AI_IMAGE` via `jagalchi-infra` |
| VM compose / deploy / local acceptance | `jagalchi-infra` | `deploy/README.md`, `deploy/personal-server.env.example` |

This platform repo **does not** ship `compose.yml`, root `.env.example`, `compose.production.yml`, `deploy/**`, or `services/{api,ai}/`.

## Release order

1. Infra production cutover lands on the VM (`/srv/jagalchi-infra`, GHCR pins, deploy/smoke).
2. Platform drops duplicated compose/deploy/service copies (Phase 2 FE clean cutover).
3. Vercel `API_ORIGIN` / realtime origin follow the infra smoke receipt.

## Local v1 harness (platform-owned)

No-MSW Playwright specs and `scripts/dev-v1.sh` / `scripts/test-v1-local-e2e.sh` remain here. They require a separate `jagalchi-infra` checkout and mode-600 env file — see `docs/local-v1.md`.

## Verification (platform CI)

```sh
pnpm install --frozen-lockfile
pnpm --filter @jagalchi/mobile exec expo install --check
pnpm --filter @jagalchi/web check:consumer-contracts
pnpm check:v1-harness
pnpm lint && pnpm test && pnpm typecheck && pnpm build
```

Production cutover receipts: `/tmp/jagalchi-{api,ai,infra}-production-cutover.md` and matching `*-postcheck.md` files.
