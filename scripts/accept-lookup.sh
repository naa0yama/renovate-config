#!/usr/bin/env bash
set -euo pipefail

for name in $(compgen -e | grep "^GIT_" || true); do unset "${name}"; done

token="$(gh auth token 2>/dev/null || true)"
if [ -z "${token}" ]; then
  echo "accept:lookup: no GitHub token from 'gh auth token'; run 'gh auth login'" >&2
  exit 1
fi

scratch="$(mktemp -d "${TMPDIR:-/tmp}/accept-lookup.XXXXXX")"
trap 'rm -rf "${scratch}"' EXIT
source="${ACCEPT_SOURCE:-git@github.com:naa0yama-org/boilerplate-rust.git}"

yarn install --frozen-lockfile --non-interactive >&2
git clone --quiet --depth 1 "${source}" "${scratch}/repo" >&2
echo "accept:lookup: source commit $(git -C "${scratch}/repo" rev-parse HEAD)" >&2

node scripts/accept.mjs config "${scratch}/config.json"

(
  cd "${scratch}/repo"
  RENOVATE_CONFIG_FILE="${scratch}/config.json" GITHUB_COM_TOKEN="${token}" \
    LOG_LEVEL=trace LOG_FORMAT=json \
    renovate --platform=local --dry-run=lookup --require-config=ignored \
    >"${scratch}/renovate.log"
)

jq -c 'select(.msg == "getReleases statistics summary") | .datasources[].registryUrls | to_entries[]
  | {request: .key, count: .value.stats.count}' "${scratch}/renovate.log" >&2
jq -c 'select(.msg == "packageFiles with updates") | .config.regex[].deps[]
  | {depName, currentValue, currentDigest, currentVersionTimestamp,
     updates: [(.updates // [])[] | {newValue, newDigest, releaseTimestamp, branchName}]}' "${scratch}/renovate.log"
jq -c 'select(.msg == "packageFiles with updates") | .config.nix[]?.deps[]?
  | {manager: "nix", depName, updates: [(.updates // [])[] | {updateType, branchName}]}' "${scratch}/renovate.log" >&2
node scripts/accept.mjs branches "${scratch}/renovate.log" >&2
