#!/usr/bin/env bash

v1_die() {
  echo "v1 local harness: $*" >&2
  exit 1
}

v1_env_value() {
  local key="$1"
  awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); gsub(/^['"'"']|['"'"']$/, ""); print; exit}' "$v1_env_file"
}

v1_real_directory() {
  (cd "$1" 2>/dev/null && pwd -P) || return 1
}

v1_mode_is_private() {
  local mode_value=$((8#$1))
  (( (mode_value & 077) == 0 ))
}

v1_initialize() {
  v1_platform_root="$1"
  v1_infra_root="${2:-${JAGALCHI_INFRA_DIR:-}}"
  [[ -n "$v1_infra_root" ]] || v1_die "usage: $0 /absolute/path/to/jagalchi-infra [/absolute/path/to/local.env]"
  [[ "$v1_infra_root" == /* ]] || v1_die "jagalchi-infra path must be absolute"
  v1_infra_root="$(v1_real_directory "$v1_infra_root")" || v1_die "jagalchi-infra checkout is missing"
  v1_env_file="${3:-${JAGALCHI_LOCAL_ENV_FILE:-$v1_infra_root/deploy/local.env}}"
  [[ "$v1_env_file" == /* ]] || v1_die "local environment path must be absolute"
  [[ -f "$v1_env_file" ]] || v1_die "local environment file is missing: $v1_env_file"

  local mode
  mode="$(stat -f '%Lp' "$v1_env_file" 2>/dev/null || stat -c '%a' "$v1_env_file")"
  v1_mode_is_private "$mode" || v1_die "local environment file must not be group/world accessible"

  local script
  for script in local-doctor.sh local-up.sh local-seed.sh; do
    [[ -x "$v1_infra_root/deploy/$script" ]] || v1_die "required backend dependency is missing or not executable: deploy/$script"
  done

  v1_platform_source="$(v1_env_value PLATFORM_SOURCE_DIR)"
  v1_api_source="$(v1_env_value API_SOURCE_DIR)"
  v1_seed_email="$(v1_env_value LOCAL_SEED_EMAIL)"
  v1_seed_password="$(v1_env_value LOCAL_SEED_PASSWORD)"
  [[ -n "$v1_platform_source" && -n "$v1_api_source" ]] || v1_die "PLATFORM_SOURCE_DIR and API_SOURCE_DIR are required"
  [[ -n "$v1_seed_email" && -n "$v1_seed_password" ]] || v1_die "LOCAL_SEED_EMAIL and LOCAL_SEED_PASSWORD are required"
  [[ "$(v1_real_directory "$v1_platform_source")" == "$(v1_real_directory "$v1_platform_root")" ]] ||
    v1_die "PLATFORM_SOURCE_DIR does not point to this checkout"
  [[ -f "$v1_api_source/package.json" ]] || v1_die "API package.json is missing"
  node -e 'const p=require(process.argv[1]); if (!p.scripts?.["dev:seed"]) process.exit(1)' "$v1_api_source/package.json" ||
    v1_die "API package must expose pnpm dev:seed -- --json"
}

v1_seed_backend() {
  local output final_line parsed
  output="$("$v1_infra_root/deploy/local-seed.sh" "$v1_env_file")" || v1_die "backend seed failed"
  final_line="$(printf '%s\n' "$output" | awk 'NF {line=$0} END {print line}')"
  parsed="$(node -e '
    const value = JSON.parse(process.argv[1]);
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (value.schemaVersion !== 1 || !uuid.test(value.userId) || !uuid.test(value.projectRunId) || !uuid.test(value.roadmapId)) process.exit(1);
    process.stdout.write([value.userId, value.projectRunId, value.roadmapId].join("\t"));
  ' "$final_line")" || v1_die "backend seed did not return the required final-line manifest"
  IFS=$'\t' read -r v1_seed_user_id v1_seed_project_run_id v1_seed_roadmap_id <<<"$parsed"
}
