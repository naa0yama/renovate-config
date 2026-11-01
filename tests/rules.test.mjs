import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preset = JSON.parse(readFileSync(join(root, "extends", "nix.json"), "utf8"));
const packageRules = preset.packageRules ?? [];

const sameList = (actual, expected) =>
	Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);

describe("nix preset rules", () => {
	it("package_rules_set_separate_major_minor_false_when_branch_tip_datasource", () => {
		const rules = packageRules.filter(
			(rule) =>
				sameList(rule.matchDatasources, ["custom.github-branch-tip"]) &&
				rule.separateMajorMinor === false,
		);
		assert.equal(rules.length, 1);
	});

	it("package_rules_disable_digest_updates_when_branch_tip_datasource", () => {
		const rules = packageRules.filter(
			(rule) =>
				sameList(rule.matchDatasources, ["custom.github-branch-tip"]) &&
				sameList(rule.matchUpdateTypes, ["digest"]) &&
				rule.enabled === false,
		);
		assert.equal(rules.length, 1);
	});

	it("package_rules_disable_digest_updates_when_nix_manager", () => {
		const rules = packageRules.filter(
			(rule) =>
				sameList(rule.matchManagers, ["nix"]) &&
				sameList(rule.matchUpdateTypes, ["digest"]) &&
				rule.enabled === false,
		);
		assert.equal(rules.length, 1);
	});

	it("nix_manager_is_enabled", () => {
		assert.equal(preset.nix?.enabled, true);
	});

	it("package_rules_have_no_lock_file_maintenance_update_type", () => {
		const rules = packageRules.filter((rule) =>
			(rule.matchUpdateTypes ?? []).includes("lockFileMaintenance"),
		);
		assert.equal(rules.length, 0);
	});

	it("preset_has_no_lock_file_maintenance_key", () => {
		assert.equal("lockFileMaintenance" in preset, false);
	});
});

describe("default preset extends", () => {
	it("extends_lists_nix_between_mise_and_npm", () => {
		const text = readFileSync(join(root, "default.json"), "utf8");
		const extendsBlock = text.slice(text.indexOf('"extends"'), text.indexOf("]"));
		const entries = [...extendsBlock.matchAll(/"(github>[^"]+)"/g)].map((m) => m[1]);
		const nix = entries.indexOf("github>naa0yama/renovate-config//extends/nix");
		assert.ok(nix > 0);
		assert.equal(entries[nix - 1], "github>naa0yama/renovate-config//extends/mise");
		assert.equal(entries[nix + 1], "github>naa0yama/renovate-config//extends/npm");
	});
});
