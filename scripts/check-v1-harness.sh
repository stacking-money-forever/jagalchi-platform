#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
bash -n \
  "$repo_root/scripts/lib/v1-local.sh" \
  "$repo_root/scripts/dev-v1.sh" \
  "$repo_root/scripts/test-v1-local-e2e.sh"

# shellcheck disable=SC1091
source "$repo_root/scripts/lib/v1-local.sh"
for rejected_mode in 0444 0440; do
  if v1_mode_is_private "$rejected_mode"; then
    echo "v1 harness accepted group/world-readable mode: $rejected_mode" >&2
    exit 1
  fi
done
for accepted_mode in 0600 0400; do
  v1_mode_is_private "$accepted_mode" || {
    echo "v1 harness rejected private mode: $accepted_mode" >&2
    exit 1
  }
done

for dependency in local-doctor.sh local-up.sh local-seed.sh dev:seed; do
  grep -Fq "$dependency" "$repo_root/scripts/lib/v1-local.sh" || {
    echo "v1 harness dependency check is missing: $dependency" >&2
    exit 1
  }
done

if grep -REn 'test\.(skip|fixme)|NEXT_PUBLIC_(API|E2E)_MOCKING.*true' \
  "$repo_root/scripts/dev-v1.sh" \
  "$repo_root/scripts/test-v1-local-e2e.sh" \
  "$repo_root/apps/web/playwright.v1-local.config.ts" \
  "$repo_root/apps/web/e2e-v1-local"; then
  echo "v1 harness must not skip tests or enable browser API mocking" >&2
  exit 1
fi

grep -Fq "name: 'chromium-no-msw'" "$repo_root/apps/web/playwright.v1-local.config.ts"
grep -Fq "serviceWorkers: 'block'" "$repo_root/apps/web/playwright.v1-local.config.ts"
grep -Fq 'expect(completedLogin.status()).toBe(200)' "$repo_root/apps/web/e2e-v1-local/helpers.ts"

for environment_file in \
  "$repo_root/scripts/dev-v1.sh" \
  "$repo_root/scripts/test-v1-local-e2e.sh" \
  "$repo_root/apps/web/playwright.v1-local.config.ts"; do
  grep -Fq 'NEXT_PUBLIC_ENV=development' "$environment_file" ||
    grep -Fq "NEXT_PUBLIC_ENV: 'development'" "$environment_file" || {
      echo "v1 harness development environment is missing: $environment_file" >&2
      exit 1
    }
done

env \
  NEXT_PUBLIC_ENV=development \
  NEXT_PUBLIC_ANALYTICS_ENABLED=false \
  NEXT_PUBLIC_REALTIME_ENABLED=true \
  NEXT_PUBLIC_REALTIME_URL=http://127.0.0.1:8080 \
  node "$repo_root/apps/web/scripts/verify-prod-env.mjs" >/dev/null

if env \
  NEXT_PUBLIC_ENV=development \
  NEXT_PUBLIC_ANALYTICS_ENABLED=false \
  NEXT_PUBLIC_REALTIME_ENABLED=true \
  NEXT_PUBLIC_REALTIME_URL=http://api.example.test:8080 \
  node "$repo_root/apps/web/scripts/verify-prod-env.mjs" >/dev/null 2>&1; then
  echo "v1 harness accepted non-loopback HTTP realtime" >&2
  exit 1
fi

env \
  E2E_TEST_EMAIL=static-check@example.test \
  E2E_TEST_PASSWORD=static-check-password \
  E2E_SEED_USER_ID=11111111-1111-4111-8111-111111111111 \
  E2E_SEED_PROJECT_RUN_ID=22222222-2222-4222-8222-222222222222 \
  E2E_SEED_ROADMAP_ID=33333333-3333-4333-8333-333333333333 \
  pnpm --dir "$repo_root/apps/web" exec playwright test \
    --config playwright.v1-local.config.ts --list
