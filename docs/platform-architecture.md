# Platform architecture

This repository is the platform delivery surface: Next.js web (Vercel), Expo mobile,
and the platform-neutral `@jagalchi/api-client`. Backend runtime and personal-server
infra are **not** vendored here. Canonical ownership:

| Concern | Repository |
| --- | --- |
| Nest API + workflow worker | `jagalchi-api` |
| Django AI service | `jagalchi-ai` |
| VM compose, deploy, local acceptance | `jagalchi-infra` |

Platform CI covers web, mobile, and `@jagalchi/api-client` only. Local v1 harness
scripts delegate to `jagalchi-infra/deploy/local-*.sh` via `JAGALCHI_INFRA_DIR`.

**Release order:** infra production cutover (VM retarget to `/srv/jagalchi-infra`,
GHCR `API_IMAGE`/`AI_IMAGE` pins, one deploy/smoke cycle) must land before platform
drops any duplicated compose/deploy copies. Phase 2 removed those copies at HEAD after
the production cutover receipts were recorded.

## Supported version boundary

| Surface | Supported baseline |
| --- | --- |
| Node.js | `>=24.3 <25` (`.nvmrc` and CI use Node 24) |
| Next.js packages | exact `16.3.4` for `next`, bundle analyzer, and ESLint plugin |
| React web | exact `19.2.5` |
| Expo | SDK `57.0.19` compatible package set, checked by `expo install --check` |
| React Native | exact `0.86.3` |
| Shared client compiler | TypeScript `5.9.3`, consumed by web TS 5.9 and mobile TS 6 |

## Web rendering and data ownership

- Pages and layouts are Server Components by default. Browser APIs, polling, forms,
  and React Flow remain small Client Components.
- Server Components call Nest directly through `src/server` modules. They never call
  the app's own Route Handlers. User and Project Run reads are `cache: 'no-store'`.
- `/projects/[runId]` streams its request-bound read under Suspense, seeds a per-request
  TanStack Query cache, and hands mutable polling to the client island.
- React Flow is loaded with `ssr: false` only inside a `use client` wrapper.
- Cache Components may only cache anonymous marketing, immutable versioned catalogs,
  and supported-platform metadata. User, operation, Project Run, GitHub, and Proof data
  must remain uncached. `cacheComponents` is enabled only with runtime navigation,
  params, search params, and private reads isolated below Suspense.

The 2026-09-03 enablement audit initially failed closed at `/explore`. The analytics
observer and request-bound route content were separated from the provider shell, and all
dynamic routes now pass the Next 16.3.4 Cache Components production build as partial
prerenders. The Proof route remains explicitly blocking with `instant = false` because
its public mutable read is intentionally `no-store`.

## Web authentication boundary

- Nest remains the authorization authority. Next Proxy reads only the non-secret
  `jagalchi-session` hint and performs optimistic redirects; it does no I/O or refresh.
- Login, refresh, registration, OAuth exchange, and logout use dedicated Route Handlers.
  Successful establishment stores the access token only in an HttpOnly, Secure cookie
  and returns a sanitized `WebSessionResponse` without tokens.
- The refresh cookie retains Nest's `/api/users/auth` path. State-changing web requests
  require same-origin plus the existing double-submit CSRF token.
- The generic `/api/[...path]` proxy strips browser `Authorization`, all cookies, and
  native-client identity headers, then derives Nest's Bearer header only from the
  HttpOnly access cookie.
- RSC reads return a session-expired state. `SessionRenewalBoundary` coalesces concurrent
  refreshes into one request and issues one `router.refresh()` after success.
- Realtime first issues a one-time ticket through same-origin `/api/realtime/tickets`;
  only that ticket enters the Socket.IO handshake. Web session cookies or markers never do.

## Shared API and mobile

`@jagalchi/api-client` contains DTOs, errors, query keys, and projection functions only.
It has no React, Next, React Native, Node builtin, or concrete storage dependency. Fetch
is injected by each consumer. Its declaration output is checked with both web and mobile
TypeScript configurations using `skipLibCheck: false`.
The generated types are pinned to the canonical API OpenAPI SHA-256 recorded in
`packages/api-client/CONTRACT.md`; drift fails the package build before compilation.

Expo Router is the native entrypoint. Login and registration call the standalone native
public-client auth endpoints, rotate sessions through native refresh, and store both
tokens through SecureStore. The native Project Run route retries a rejected access token
after refresh, renders React Native primitives, and never uses a WebView. The legacy
WebView/IAP implementation remains preserved for a separate migration and is not the
current entrypoint.

## Verification

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @jagalchi/mobile exec expo install --check
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```
