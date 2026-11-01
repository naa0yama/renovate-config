# Shared setup for the accept-*.bats files: puts tests/stubs first on PATH and
# gives every test its own record dir ($STUB_DIR) and scratch parent ($TMPDIR).
REPO_ROOT="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"

setup_accept() {
  STUB_DIR="${BATS_TEST_TMPDIR}/stub"
  mkdir -p "${STUB_DIR}" "${BATS_TEST_TMPDIR}/tmp"
  export STUB_DIR
  export TMPDIR="${BATS_TEST_TMPDIR}/tmp"
  export STUB_GH_TOKEN="ghp_example_token"
  export PATH="${REPO_ROOT}/tests/stubs:${PATH}"
  unset ACCEPT_SOURCE TASK_BIN
  cd "${REPO_ROOT}"
}

# Number of recorded calls to stub $1.
call_count() {
  { grep -c "^$1 " "${STUB_DIR}/calls.log" 2>/dev/null || true; } | head -n 1
}

# Names of the entries left in the scratch parent.
leftover_scratch() {
  ls -A "${TMPDIR}"
}
