import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const renovateBin = join(root, "node_modules", ".bin", "renovate");

const gitStatus = () =>
	spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout;

const expectedDeps = [
	{
		depName: "alpha-pkgs",
		packageName: "example-org/alpha-pkgs",
		currentValue: "2026.01.02.03.04.05",
		currentDigest: "1111111111111111111111111111111111111111",
		registryUrls: [
			"https://api.github.com/repos/example-org/alpha-pkgs/activity?ref=refs/heads/alpha-unstable&per_page=100",
		],
	},
	{
		depName: "beta-fmt",
		packageName: "example-org/beta-fmt",
		currentValue: "2026.02.03.04.05.06",
		currentDigest: "2222222222222222222222222222222222222222",
		registryUrls: [
			"https://api.github.com/repos/example-org/beta-fmt/activity?ref=refs/heads/main&per_page=100",
		],
	},
];

// INVARIANT: git hooks export GIT_DIR/GIT_INDEX_FILE, which would point renovate's local platform at this repo instead of the scratch copy; the env cannot be scoped any other way for a child process.
const envWithoutGit = Object.fromEntries(
	Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
);

let deps;
let statusBefore;
let statusAfter;

const extractDeps = () => {
	const scratch = mkdtempSync(join(tmpdir(), "nix-extract-"));
	const repo = join(scratch, "repo");
	mkdirSync(repo);
	cpSync(join(root, "tests", "fixtures", "flake.nix"), join(repo, "flake.nix"));

	const preset = JSON.parse(readFileSync(join(root, "extends", "nix.json"), "utf8"));
	const configFile = join(scratch, "config.js");
	writeFileSync(
		configFile,
		`module.exports = ${JSON.stringify({
			customManagers: preset.customManagers,
			onboarding: false,
			requireConfig: "optional",
		})};`,
	);

	const result = spawnSync(
		renovateBin,
		["--platform=local", "--dry-run=extract", "--require-config=optional"],
		{
			cwd: repo,
			encoding: "utf8",
			env: {
				...envWithoutGit,
				RENOVATE_CONFIG_FILE: configFile,
				LOG_LEVEL: "debug",
				LOG_FORMAT: "json",
			},
		},
	);
	assert.equal(result.status, 0, result.stderr);

	const logs = result.stdout
		.split("\n")
		.filter((line) => line.startsWith("{"))
		.map((line) => JSON.parse(line));
	const entry = logs.find((log) => log.packageFiles?.regex);
	assert.ok(entry, "extract log with regex package files not found");
	return entry.packageFiles.regex.flatMap((file) => file.deps);
};

describe("flake.nix regex manager extract", () => {
	before(() => {
		statusBefore = gitStatus();
		deps = extractDeps();
		statusAfter = gitStatus();
	});

	for (const expected of expectedDeps) {
		it(`extracts_dep_fields_when_annotation_precedes_url_${expected.depName}`, () => {
			const dep = deps.find((d) => d.depName === expected.depName);
			assert.ok(dep, `dep ${expected.depName} not extracted`);
			assert.equal(dep.packageName, expected.packageName);
			assert.equal(dep.currentValue, expected.currentValue);
			assert.equal(dep.currentDigest, expected.currentDigest);
		});

		it(`expands_registry_url_when_annotation_precedes_url_${expected.depName}`, () => {
			const dep = deps.find((d) => d.depName === expected.depName);
			assert.deepEqual(dep.registryUrls, expected.registryUrls);
		});

		it(`uses_loose_versioning_when_annotation_precedes_url_${expected.depName}`, () => {
			const dep = deps.find((d) => d.depName === expected.depName);
			assert.equal(dep.versioning, "loose");
		});
	}

	it("extracts_only_annotated_inputs_when_url_not_directly_below_annotation", () => {
		const names = deps.map((d) => d.depName).sort();
		assert.deepEqual(names, ["alpha-pkgs", "beta-fmt"]);
	});

	it("leaves_repo_status_unchanged_when_extract_runs", () => {
		assert.equal(statusAfter, statusBefore);
	});
});
