#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
# shellcheck disable=SC1091
source "$repo_root/scripts/lib/v1-local.sh"
v1_initialize "$repo_root" "${1:-}" "${2:-}"

"$v1_infra_root/deploy/local-doctor.sh" "$v1_env_file"
"$v1_infra_root/deploy/local-up.sh" "$v1_env_file"
v1_seed_backend

echo "v1 local backend ready: projectRunId=$v1_seed_project_run_id roadmapId=$v1_seed_roadmap_id"
exec env \
  API_ORIGIN=http://127.0.0.1:8080 \
  NEXT_PUBLIC_API_URL=/api \
  NEXT_PUBLIC_ENV=development \
  NEXT_PUBLIC_ANALYTICS_ENABLED=false \
  NEXT_PUBLIC_API_MOCKING=false \
  NEXT_PUBLIC_E2E_MOCKING=false \
  NEXT_PUBLIC_REALTIME_ENABLED=true \
  NEXT_PUBLIC_REALTIME_URL=http://127.0.0.1:8080 \
  NEXT_PUBLIC_EVIDENCE_EXECUTION_ENABLED=true \
  NEXT_PUBLIC_PROOF_PROFILE_ENABLED=true \
  NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000 \
  pnpm --dir "$repo_root/apps/web" dev --hostname 127.0.0.1 --port 3000
