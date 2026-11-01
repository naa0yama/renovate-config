import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const script = join(root, "scripts", "accept.mjs");
const fixtures = join(root, "tests", "fixtures", "accept");

const NOW = Date.parse("2026-06-01T00:00:00Z") / 1000;
const WINDOW = 604800;

const run = (args) => spawnSync("node", [script, ...args], { cwd: root, encoding: "utf8" });

const judge = (name, extra = ["--now", String(NOW)]) =>
	run(["judge", join(fixtures, name), ...extra]);

const lines = (text) => text.split("\n").filter((line) => line !== "");

const TABLE_HEADER = "accept:compare: dep|exclusion|observation|verdict";

const rowsOf = (stdout) =>
	lines(stdout).filter(
		(line) => line.startsWith("accept:compare: ") && line.includes("|") && line !== TABLE_HEADER,
	);

const rowFor = (stdout, dep) => rowsOf(stdout).find((line) => line.startsWith(`accept:compare: ${dep}|`));

const snapshot = (dir) => {
	const entries = {};
	const walk = (current) => {
		for (const name of readdirSync(current).sort()) {
			const path = join(current, name);
			if (statSync(path).isDirectory()) walk(path);
			else entries[path] = readFileSync(path, "utf8");
		}
	};
	walk(dir);
	return entries;
};

const withDefaults = (age, body) => {
	const dir = mkdtempSync(join(tmpdir(), "accept-test-"));
	try {
		const defaults = join(dir, "default.json");
		writeFileSync(defaults, `{\n\t// pull request\n\t"minimumReleaseAge": "${age}"\n}\n`);
		return body(defaults, dir);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
};

const gitStatus = () =>
	spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout;

describe("accept-judge table rows", () => {
	const result = judge("mixed");
	const expectedRows = [
		"accept:compare: up-ok|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=1 2026.05.01.00.00.00 bbbbbbbbbbbb release 2026-05-01T00:00:00.000Z branch renovate/up-ok-main|ok",
		"accept:compare: still-ok|-|pin=no plan=cccccccccccc lookup_updates=0 current 2026-04-01T00:00:00Z|ok",
		"accept:compare: skip-recent|excluded:bad-1|pin=yes plan=ffffffffffff lookup_updates=0|SKIP",
		"accept:compare: skip-dup|excluded:bad-5|pin=yes plan=222222222222 lookup_updates=0|SKIP",
		"accept:compare: nolookup|-|missing lookup row or plan line|MISMATCH",
		'accept:compare: (branches)|-|no digest branch in ["renovate/up-ok-main"]|ok',
	];

	it("table_has_header_and_expected_rows_when_fixture_mixes_every_outcome", () => {
		assert.deepEqual(lines(result.stdout).slice(0, 7), [TABLE_HEADER, ...expectedRows]);
	});
});

describe("accept-judge MISMATCH branches", () => {
	const { stdout } = judge("mismatches");
	const expected = {
		"plan-bad":
			"accept:compare: plan-bad|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=0 plan result stale|MISMATCH",
		"pin-none":
			"accept:compare: pin-none|-|pin=no plan=cccccccccccc lookup_updates=1 lookup has 1 update(s), pin has none|MISMATCH",
		"count-bad":
			"accept:compare: count-bad|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=2 lookup has 2 update(s), pin has one|MISMATCH",
		"ts-differs":
			"accept:compare: ts-differs|-|pin=no plan=cccccccccccc lookup_updates=0 currentVersionTimestamp 2026-04-01T00:00:00Z vs release 2026-04-02T00:00:00Z|MISMATCH",
		"value-differs":
			"accept:compare: value-differs|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=1 lookup 2026.05.02.00.00.00 bbbbbbbbbbbb vs pin 2026.05.01.00.00.00 bbbbbbbbbbbb|MISMATCH",
		"two-branches":
			"accept:compare: two-branches|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=1 2 version branch(es) for two-branches (renovate/two-branches-main)|MISMATCH",
		wait: "accept:compare: wait|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=1 releaseTimestamp 2026-05-30T00:00:00.000Z is within 7 days of the run|MISMATCH",
		"empty-ts":
			"accept:compare: empty-ts|-|pin=yes plan=bbbbbbbbbbbb lookup_updates=1 releaseTimestamp  is within 7 days of the run|MISMATCH",
		"(branches)":
			'accept:compare: (branches)|-|digest branches present ["renovate/wait-main-digest"]|MISMATCH',
	};

	for (const [dep, row] of Object.entries(expected)) {
		it(`row_is_mismatch_with_expected_observation_when_dep_is_${dep}`, () => {
			assert.equal(rowFor(stdout, dep), row);
		});
	}
});

describe("accept-judge exit status and final line", () => {
	it("exits_0_and_prints_all_match_on_stdout_when_every_dep_matches", () => {
		const result = judge("all-match");
		assert.equal(result.status, 0);
		assert.equal(lines(result.stdout).at(-1), "accept:compare: all compared deps match");
	});

	it("exits_1_and_prints_mismatch_on_stderr_when_a_row_is_mismatch", () => {
		const result = judge("mixed");
		assert.equal(result.status, 1);
		assert.equal(
			lines(result.stderr).at(-1),
			"accept:compare: mismatch between the preset and devkit-flake-pin",
		);
		assert.ok(!result.stdout.includes("all compared deps match"));
	});

	it("exits_1_and_prints_proves_nothing_on_stderr_when_no_dep_has_an_update", () => {
		const result = judge("no-update");
		assert.equal(result.status, 1);
		assert.equal(
			lines(result.stderr).at(-1),
			"accept:compare: no non-excluded dep has an update in devkit-flake-pin; the comparison proves nothing",
		);
	});

	it("ends_with_proves_nothing_and_omits_mismatch_when_both_conditions_hold", () => {
		const result = judge("no-update-mismatch");
		assert.equal(result.status, 1);
		assert.ok(rowFor(result.stdout, "nolookup")?.endsWith("|MISMATCH"));
		assert.equal(
			lines(result.stderr).at(-1),
			"accept:compare: no non-excluded dep has an update in devkit-flake-pin; the comparison proves nothing",
		);
		assert.ok(!result.stderr.includes("mismatch between the preset and devkit-flake-pin"));
	});

	it("prints_one_branches_line_on_stderr_when_judge_runs", () => {
		const result = judge("all-match");
		const branchLines = lines(result.stderr).filter((line) =>
			line.startsWith("accept:compare: branches "),
		);
		assert.deepEqual(branchLines, ['accept:compare: branches ["renovate/up-ok-main"]']);
	});
});

describe("accept-judge inputs", () => {
	for (const missing of ["lookup.out", "lookup.err", "plan.txt", join("src", "flake.nix")]) {
		it(`fails_naming_the_file_without_a_table_when_${missing.replace("/", "_")}_is_absent`, () => {
			const dir = mkdtempSync(join(tmpdir(), "accept-test-"));
			try {
				cpSync(join(fixtures, "all-match"), dir, { recursive: true });
				rmSync(join(dir, missing));
				const result = run(["judge", dir, "--now", String(NOW)]);
				assert.notEqual(result.status, 0);
				assert.ok(result.stderr.includes(missing));
				assert.equal(result.stdout, "");
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		});
	}

	it("leaves_the_fixture_unchanged_when_judge_runs", () => {
		const dir = join(fixtures, "mixed");
		const before = snapshot(dir);
		judge("mixed");
		assert.deepEqual(snapshot(dir), before);
	});

	it("turns_a_waiting_dep_ok_when_now_is_shifted_past_the_window", () => {
		const base = judge("mismatches");
		const shifted = judge("mismatches", ["--now", String(NOW + 4 * WINDOW)]);
		assert.ok(rowFor(base.stdout, "wait")?.endsWith("|MISMATCH"));
		assert.ok(rowFor(shifted.stdout, "wait")?.endsWith("|ok"));
	});

	it("stops_excluding_bad_1_dep_when_now_is_shifted_past_the_window", () => {
		const base = judge("mismatches");
		const shifted = judge("mismatches", ["--now", String(NOW + 4 * WINDOW)]);
		assert.ok(rowFor(base.stdout, "skip-recent")?.includes("|excluded:bad-1|"));
		assert.ok(rowFor(shifted.stdout, "skip-recent")?.startsWith("accept:compare: skip-recent|-|"));
	});
});

describe("accept-annotations", () => {
	const flake = join(fixtures, "mixed", "src", "flake.nix");

	it("prints_dep_package_branch_tab_separated_in_file_order_when_flake_has_annotations", () => {
		const result = run(["annotations", flake]);
		assert.equal(result.status, 0);
		assert.deepEqual(lines(result.stdout), [
			"up-ok\texample-org/up-ok\tmain",
			"still-ok\texample-org/still-ok\tmain",
			"skip-recent\texample-org/skip-recent\tmain",
			"skip-dup\texample-org/skip-dup\tmain",
			"nolookup\texample-org/nolookup\tmain",
		]);
	});

	it("fails_naming_the_path_with_empty_stdout_when_the_path_is_absent", () => {
		const missing = join(fixtures, "no-such-dir", "flake.nix");
		const result = run(["annotations", missing]);
		assert.notEqual(result.status, 0);
		assert.ok(result.stderr.includes(missing));
		assert.equal(result.stdout, "");
	});

	it("leaves_the_fixture_unchanged_when_annotations_runs", () => {
		const dir = join(fixtures, "mixed");
		const before = snapshot(dir);
		run(["annotations", flake]);
		assert.deepEqual(snapshot(dir), before);
	});

	it("lists_the_same_deps_as_the_judge_table_when_given_the_same_flake", () => {
		const annotated = lines(run(["annotations", flake]).stdout).map((line) => line.split("\t")[0]);
		const judged = rowsOf(judge("mixed").stdout)
			.map((row) => row.slice("accept:compare: ".length).split("|")[0])
			.filter((dep) => dep !== "(branches)");
		assert.deepEqual(new Set(annotated), new Set(judged));
	});
});

const branchLog = (name) => join(fixtures, "branches", name, "renovate.jsonl");

const branchesOf = (name) => {
	const result = run(["branches", branchLog(name)]);
	return { ...result, branches: JSON.parse(result.stdout).branches };
};

describe("accept-branches", () => {
	it("includes_the_all_pending_digest_branch_and_the_mixed_branch_when_log_has_other_sources", () => {
		assert.deepEqual(branchesOf("all-pending").branches.sort(), [
			"renovate/up-mixed-main",
			"renovate/up-ok-digest",
		]);
	});

	it("excludes_the_branch_when_its_update_is_disabled_by_a_rule", () => {
		assert.deepEqual(branchesOf("disabled-update").branches, ["renovate/up-off-main"]);
	});

	it("lists_the_branch_once_when_it_appears_in_two_logs", () => {
		assert.deepEqual(branchesOf("duplicate").branches, ["renovate/twice-main"]);
	});

	it("prints_one_json_line_to_stdout_when_branches_runs", () => {
		const { stdout } = run(["branches", branchLog("duplicate")]);
		assert.equal(lines(stdout).length, 1);
		assert.ok(stdout.endsWith("\n"));
	});

	it("names_the_path_on_stderr_and_prints_nothing_when_the_log_is_absent", () => {
		const missing = join(fixtures, "branches", "absent", "renovate.jsonl");
		const result = run(["branches", missing]);
		assert.notEqual(result.status, 0);
		assert.ok(result.stderr.includes(missing));
		assert.equal(result.stdout, "");
	});

	it("leaves_the_fixture_unchanged_when_branches_runs", () => {
		const dir = join(fixtures, "branches");
		const before = snapshot(dir);
		run(["branches", branchLog("all-pending")]);
		assert.deepEqual(snapshot(dir), before);
	});

	it("turns_the_judge_branches_row_mismatch_when_branches_output_has_a_digest_branch", () => {
		const dir = mkdtempSync(join(tmpdir(), "accept-test-"));
		try {
			cpSync(join(fixtures, "mixed"), dir, { recursive: true });
			writeFileSync(join(dir, "lookup.err"), run(["branches", branchLog("all-pending")]).stdout);
			const row = rowFor(run(["judge", dir, "--now", String(NOW)]).stdout, "(branches)");
			assert.ok(row?.endsWith("|MISMATCH"));
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("accept-config", () => {
	it("writes_the_nix_preset_without_schema_plus_window_and_onboarding_off", () => {
		const dir = mkdtempSync(join(tmpdir(), "accept-test-"));
		try {
			const out = join(dir, "config.json");
			const result = run(["config", out]);
			assert.equal(result.status, 0);
			const preset = JSON.parse(readFileSync(join(root, "extends", "nix.json"), "utf8"));
			delete preset.$schema;
			assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), {
				...preset,
				minimumReleaseAge: "7 days",
				onboarding: false,
			});
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});

	it("changes_nothing_in_the_repo_besides_the_out_path_when_config_runs", () => {
		const dir = mkdtempSync(join(tmpdir(), "accept-test-"));
		try {
			const before = gitStatus();
			run(["config", join(dir, "config.json")]);
			assert.equal(gitStatus(), before);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	});
});

describe("accept-window", () => {
	const DAY = 86400;
	const SKIP_RECENT_OLDEST = Date.parse("2026-05-27T20:00:00Z") / 1000;

	const judgeWithWindow = (fixture, age, now) =>
		withDefaults(age, (defaults) =>
			run(["judge", join(fixtures, fixture), "--defaults", defaults, "--now", String(now)]),
		);

	it("marks_a_dep_ok_when_its_release_is_older_than_the_injected_window", () => {
		const { stdout } = judgeWithWindow("mismatches", "3 days", NOW + 2 * DAY);
		assert.ok(rowFor(stdout, "wait")?.endsWith("|ok"));
	});

	it("marks_a_dep_mismatch_naming_the_window_when_its_release_is_inside_the_injected_window", () => {
		const { stdout } = judgeWithWindow("mismatches", "3 days", NOW);
		const row = rowFor(stdout, "wait");
		assert.ok(row?.endsWith("|MISMATCH"));
		assert.ok(row.includes("within 3 days of the run"));
	});

	it("keeps_a_bad_1_dep_in_when_the_oldest_record_is_older_than_the_injected_window", () => {
		const { stdout } = judgeWithWindow("mismatches", "3 days", SKIP_RECENT_OLDEST + 5 * DAY);
		assert.ok(rowFor(stdout, "skip-recent")?.startsWith("accept:compare: skip-recent|-|"));
	});

	it("writes_the_injected_window_into_the_config_when_defaults_is_given", () => {
		withDefaults("3 days", (defaults, dir) => {
			const out = join(dir, "config.json");
			const result = run(["config", out, "--defaults", defaults]);
			assert.equal(result.status, 0);
			assert.equal(JSON.parse(readFileSync(out, "utf8")).minimumReleaseAge, "3 days");
		});
	});

	it("fails_naming_value_and_form_without_writing_when_config_window_is_not_in_days", () => {
		withDefaults("1 week", (defaults, dir) => {
			const out = join(dir, "config.json");
			const result = run(["config", out, "--defaults", defaults]);
			assert.notEqual(result.status, 0);
			assert.ok(result.stderr.includes("1 week"));
			assert.ok(result.stderr.includes("^\\d+ days?$"));
			assert.equal(result.stdout, "");
			assert.equal(existsSync(out), false);
		});
	});

	it("fails_with_the_config_message_and_no_table_when_judge_window_is_not_in_days", () => {
		withDefaults("1 week", (defaults, dir) => {
			const config = run(["config", join(dir, "config.json"), "--defaults", defaults]);
			const result = run(["judge", join(fixtures, "all-match"), "--defaults", defaults, "--now", String(NOW)]);
			assert.notEqual(result.status, 0);
			assert.equal(result.stderr, config.stderr);
			assert.equal(result.stdout, "");
		});
	});

	it("leaves_the_defaults_file_unchanged_when_config_and_judge_read_it", () => {
		withDefaults("3 days", (defaults, dir) => {
			const before = readFileSync(defaults, "utf8");
			run(["config", join(dir, "config.json"), "--defaults", defaults]);
			run(["judge", join(fixtures, "all-match"), "--defaults", defaults, "--now", String(NOW)]);
			assert.equal(readFileSync(defaults, "utf8"), before);
		});
	});
});
