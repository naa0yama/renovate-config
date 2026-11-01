#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

load helpers

setup() {
  setup_accept
  export STUB_GIT_SHA="0123456789abcdef0123456789abcdef01234567"
  export STUB_TASK_STDERR='accept:lookup: source commit 0123456789abcdef0123456789abcdef01234567
{"manager":"nix","depName":"beta","updates":[]}'
  export STUB_NIX_PIN_OUTPUT='input=beta plan=update'
  export STUB_NODE_ANNOTATIONS=$'alpha\texample-org/alpha\tmain\nbeta\texample-org/beta\tmain\n'
}

@test "accept-compare exits 1 with the gh auth login hint when gh returns no token" {
  export STUB_GH_TOKEN=""
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 1 ]
  [[ "${stderr}" == *"gh auth login"* ]]
}

@test "accept-compare does not call git when gh returns no token" {
  export STUB_GH_TOKEN=""
  run --separate-stderr bash scripts/accept-compare.sh
  [ "$(call_count git)" -eq 0 ]
}

@test "accept-compare exits 1 and reports both outputs when lookup fails" {
  export STUB_TASK_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 1 ]
  [[ "${stderr}" == *"lookup exit 1, devkit-flake-pin exit 0"* ]]
  [[ "${stderr}" == *'"manager":"nix"'* ]]
  [[ "${stderr}" == *"input=beta plan=update"* ]]
}

@test "accept-compare skips judge when lookup fails" {
  export STUB_TASK_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  ! grep -q '^node scripts/accept.mjs judge ' "${STUB_DIR}/calls.log"
}

@test "accept-compare exits 1 and reports both outputs when pin fails" {
  export STUB_NIX_PIN_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 1 ]
  [[ "${stderr}" == *"lookup exit 0, devkit-flake-pin exit 1"* ]]
  [[ "${stderr}" == *'"manager":"nix"'* ]]
  [[ "${stderr}" == *"input=beta plan=update"* ]]
}

@test "accept-compare skips judge when pin fails" {
  export STUB_NIX_PIN_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  ! grep -q '^node scripts/accept.mjs judge ' "${STUB_DIR}/calls.log"
}

@test "accept-compare prints the source commit on stderr" {
  run --separate-stderr bash scripts/accept-compare.sh
  [[ "${stderr}" == *"accept:compare: source commit ${STUB_GIT_SHA}"* ]]
}

@test "accept-compare prints the lookup nix line on stderr" {
  run --separate-stderr bash scripts/accept-compare.sh
  [[ "${stderr}" == *'{"manager":"nix","depName":"beta","updates":[]}'* ]]
}

@test "accept-compare prints the pin input= line on stderr" {
  run --separate-stderr bash scripts/accept-compare.sh
  [[ "${stderr}" == *"input=beta plan=update"* ]]
}

@test "accept-compare calls task accept:lookup from PATH when TASK_BIN is unset" {
  run --separate-stderr bash scripts/accept-compare.sh
  grep -q '^task accept:lookup$' "${STUB_DIR}/calls.log"
}

@test "accept-compare exits 1 when judge exits 1" {
  export STUB_NODE_JUDGE_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 1 ]
}

@test "accept-compare exits 0 when judge exits 0" {
  export STUB_NODE_JUDGE_EXIT=0
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 0 ]
  grep -q '^node scripts/accept.mjs judge ' "${STUB_DIR}/calls.log"
}

@test "accept-compare passes judge the same epoch it printed as the run time" {
  run --separate-stderr bash scripts/accept-compare.sh
  judge_now="$(sed -n 's/^node scripts\/accept.mjs judge .* --now //p' "${STUB_DIR}/calls.log")"
  run_at="$(printf '%s\n' "${stderr}" | sed -n 's/^accept:compare: run at //p')"
  [ -n "${judge_now}" ]
  [ "$(date -u -d "${run_at}" +%s)" -eq "${judge_now}" ]
}

@test "accept-compare calls curl once per annotated dep" {
  run --separate-stderr bash scripts/accept-compare.sh
  [ "$(call_count curl)" -eq 2 ]
}

@test "accept-compare keeps the token out of curl argv" {
  run --separate-stderr bash scripts/accept-compare.sh
  [ "$(call_count curl)" -eq 2 ]
  ! grep '^curl ' "${STUB_DIR}/calls.log" | grep -q "${STUB_GH_TOKEN}"
}

@test "accept-compare sends the token to curl on stdin" {
  run --separate-stderr bash scripts/accept-compare.sh
  [ "$(grep -c "Bearer ${STUB_GH_TOKEN}" "${STUB_DIR}/curl.stdin")" -eq 2 ]
}

@test "accept-compare gives git and nix no GIT_ variables when GIT_DIR is set" {
  GIT_DIR=/nonexistent run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 0 ]
  [ -s "${STUB_DIR}/git.env" ]
  [ -s "${STUB_DIR}/nix.env" ]
  ! grep -q '^GIT_' "${STUB_DIR}/git.env"
  ! grep -q '^GIT_' "${STUB_DIR}/nix.env"
}

@test "accept-compare leaves no scratch dir after a successful run" {
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 0 ]
  [ -z "$(leftover_scratch)" ]
}

@test "accept-compare leaves no scratch dir after a failed run" {
  export STUB_TASK_EXIT=1
  run --separate-stderr bash scripts/accept-compare.sh
  [ "${status}" -eq 1 ]
  [ -z "$(leftover_scratch)" ]
}
