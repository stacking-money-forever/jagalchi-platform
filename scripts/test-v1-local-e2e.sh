#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
# shellcheck disable=SC1091
source "$repo_root/scripts/lib/v1-local.sh"
v1_initialize "$repo_root" "${1:-}" "${2:-}"

"$v1_infra_root/deploy/local-doctor.sh" "$v1_env_file"
"$v1_infra_root/deploy/local-up.sh" "$v1_env_file"
v1_seed_backend

export E2E_TEST_EMAIL="$v1_seed_email"
export E2E_TEST_PASSWORD="$v1_seed_password"
export E2E_SEED_USER_ID="$v1_seed_user_id"
export E2E_SEED_PROJECT_RUN_ID="$v1_seed_project_run_id"
export E2E_SEED_ROADMAP_ID="$v1_seed_roadmap_id"
export API_ORIGIN=http://127.0.0.1:8080
export NEXT_PUBLIC_API_URL=/api
export NEXT_PUBLIC_ENV=development
export NEXT_PUBLIC_ANALYTICS_ENABLED=false
export NEXT_PUBLIC_API_MOCKING=false
export NEXT_PUBLIC_E2E_MOCKING=false
export NEXT_PUBLIC_REALTIME_ENABLED=true
export NEXT_PUBLIC_REALTIME_URL=http://127.0.0.1:8080
export NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED=true
export NEXT_PUBLIC_PROJECT_RUNS_ENABLED=true
export NEXT_PUBLIC_PROOF_PROFILE_ENABLED=true
export E2E_WEB_PORT="${E2E_WEB_PORT:-3100}"
export E2E_BASE_URL="${E2E_BASE_URL:-http://127.0.0.1:$E2E_WEB_PORT}"
export NEXT_PUBLIC_SITE_URL="$E2E_BASE_URL"

pnpm --dir "$repo_root/apps/web" build
exec pnpm --dir "$repo_root/apps/web" exec playwright test --config playwright.v1-local.config.ts
