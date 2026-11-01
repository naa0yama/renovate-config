#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

load helpers

setup() {
  setup_accept
  export STUB_RENOVATE_LOG="${BATS_TEST_TMPDIR}/renovate-output.log"
  {
    printf '%s\n' '{"msg":"getReleases statistics summary","datasources":{"github-tags":{"registryUrls":{"https://api.github.com":{"stats":{"count":3}}}}}}'
    printf '%s\n' '{"msg":"packageFiles with updates","config":{"regex":[{"deps":[{"depName":"alpha","currentValue":"1.0.0","updates":[{"newValue":"1.1.0","branchName":"renovate/alpha-1.x"}]}]}],"nix":[{"deps":[{"depName":"beta","updates":[{"updateType":"digest","branchName":"renovate/beta"}]}]}]}}'
    printf '%s\n' '{"msg":"generateBranchConfig","branchName":"renovate/alpha-1.x"}'
  } >"${STUB_RENOVATE_LOG}"
  export STUB_NODE_BRANCHES='{"branches":["renovate/alpha-1.x"]}'
}

@test "accept-lookup exits 1 with the gh auth login hint when gh returns no token" {
  export STUB_GH_TOKEN=""
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "${status}" -eq 1 ]
  [[ "${stderr}" == *"gh auth login"* ]]
}

@test "accept-lookup calls neither git nor node when gh returns no token" {
  export STUB_GH_TOKEN=""
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "$(call_count git)" -eq 0 ]
  [ "$(call_count node)" -eq 0 ]
}

@test "accept-lookup prints the regex dep line with branchName on stdout" {
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "${status}" -eq 0 ]
  [[ "${output}" == *'"depName":"alpha"'* ]]
  [[ "${output}" == *'"branchName":"renovate/alpha-1.x"'* ]]
}

@test "accept-lookup prints the nix dep line with branchName on stderr" {
  run --separate-stderr bash scripts/accept-lookup.sh
  [[ "${stderr}" == *'"manager":"nix"'*'"branchName":"renovate/beta"'* ]]
}

@test "accept-lookup prints exactly one branches line on stderr" {
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "$(printf '%s\n' "${stderr}" | grep -c '^{"branches"')" -eq 1 ]
}

@test "accept-lookup runs renovate with LOG_LEVEL trace" {
  run --separate-stderr bash scripts/accept-lookup.sh
  grep -qx 'LOG_LEVEL=trace' "${STUB_DIR}/renovate.env"
}

@test "accept-lookup prints one request count line on stderr per registry" {
  run --separate-stderr bash scripts/accept-lookup.sh
  [[ "${stderr}" == *'{"request":"https://api.github.com","count":3}'* ]]
}

@test "accept-lookup passes the renovate log to node accept.mjs branches" {
  run --separate-stderr bash scripts/accept-lookup.sh
  grep -q '^node scripts/accept.mjs branches ' "${STUB_DIR}/calls.log"
  cmp "${STUB_RENOVATE_LOG}" "${STUB_DIR}/branches-input.log"
}

@test "accept-lookup points RENOVATE_CONFIG_FILE at the path node accept.mjs config wrote" {
  run --separate-stderr bash scripts/accept-lookup.sh
  config_path="$(sed -n 's/^node scripts\/accept.mjs config //p' "${STUB_DIR}/calls.log")"
  [ -n "${config_path}" ]
  grep -qx "RENOVATE_CONFIG_FILE=${config_path}" "${STUB_DIR}/renovate.env"
}

@test "accept-lookup gives git no GIT_ variables when GIT_DIR is set" {
  GIT_DIR=/nonexistent run --separate-stderr bash scripts/accept-lookup.sh
  [ "${status}" -eq 0 ]
  [ -s "${STUB_DIR}/git.env" ]
  run ! grep -q '^GIT_' "${STUB_DIR}/git.env"
}

@test "accept-lookup leaves no scratch dir after a successful run" {
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "${status}" -eq 0 ]
  [ -z "$(leftover_scratch)" ]
}

@test "accept-lookup leaves no scratch dir after a failed run" {
  export STUB_RENOVATE_EXIT=1
  run --separate-stderr bash scripts/accept-lookup.sh
  [ "${status}" -ne 0 ]
  [ "$(call_count renovate)" -eq 1 ]
  [ -z "$(leftover_scratch)" ]
}
