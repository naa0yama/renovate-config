#!/usr/bin/env bash
set -euo pipefail

for name in $(compgen -e | grep "^GIT_" || true); do unset "${name}"; done

token="$(gh auth token 2>/dev/null || true)"
if [ -z "${token}" ]; then
  echo "accept:compare: no GitHub token from 'gh auth token'; run 'gh auth login'" >&2
  exit 1
fi

scratch="$(mktemp -d "${TMPDIR:-/tmp}/accept-compare.XXXXXX")"
trap 'rm -rf "${scratch}"' EXIT
source="${ACCEPT_SOURCE:-git@github.com:naa0yama-org/boilerplate-rust.git}"

git clone --quiet --depth 1 "${source}" "${scratch}/src" >&2
source_sha="$(git -C "${scratch}/src" rev-parse HEAD)"
echo "accept:compare: source commit ${source_sha}" >&2
cp -a "${scratch}/src" "${scratch}/pin"

nix develop "${scratch}/pin" -c true >&2

now="$(date -u +%s)"
echo "accept:compare: run at $(date -u -d "@${now}" +%Y-%m-%dT%H:%M:%SZ)" >&2

ACCEPT_SOURCE="file://${scratch}/src" "${TASK_BIN:-task}" accept:lookup \
  >"${scratch}/lookup.out" 2>"${scratch}/lookup.err" &
lookup_pid=$!
(cd "${scratch}/pin" && nix develop . -c devkit-flake-pin update) >"${scratch}/pin.log" 2>&1 &
pin_pid=$!
lookup_rc=0
pin_rc=0
wait "${lookup_pid}" || lookup_rc=$?
wait "${pin_pid}" || pin_rc=$?
if [ "${lookup_rc}" -ne 0 ] || [ "${pin_rc}" -ne 0 ]; then
  echo "accept:compare: lookup exit ${lookup_rc}, devkit-flake-pin exit ${pin_rc}" >&2
  echo "--- lookup stderr" >&2
  cat "${scratch}/lookup.err" >&2
  echo "--- devkit-flake-pin output" >&2
  cat "${scratch}/pin.log" >&2
  exit 1
fi
grep '^accept:lookup: source commit' "${scratch}/lookup.err" >&2 || true
grep '^input=' "${scratch}/pin.log" >"${scratch}/plan.txt" || true
cat "${scratch}/plan.txt" >&2

{ grep '^{' "${scratch}/lookup.err" || true; } | jq -c 'select(.manager == "nix")' >&2

while IFS=$'\t' read -r dep package branch; do
  printf 'header = "Authorization: Bearer %s"\n' "${token}" \
    | curl -sS -f --max-time 30 -K - -H 'Accept: application/vnd.github+json' \
      -o "${scratch}/page-${dep}.json" "https://api.github.com/repos/${package}/activity?ref=refs/heads/${branch}&per_page=100"
done < <(node scripts/accept.mjs annotations "${scratch}/src/flake.nix")

node scripts/accept.mjs judge "${scratch}" --now "${now}"
