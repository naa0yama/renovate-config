import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import jsonata from "jsonata";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const preset = JSON.parse(readFileSync(join(root, "extends", "nix.json"), "utf8"));
const activity = JSON.parse(readFileSync(join(root, "tests", "fixtures", "activity.json"), "utf8"));
const templates = preset.customDatasources?.["github-branch-tip"]?.transformTemplates ?? [];

const allZero = "0".repeat(40);

const expectedReleases = [
	{
		after: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		oldest: "2026-03-05T00:15:30.000Z",
		version: "2026.03.05.00.15.30",
	},
	{
		after: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
		oldest: "2026-04-10T23:59:59.000Z",
		version: "2026.04.10.23.59.59",
	},
	{
		after: "cccccccccccccccccccccccccccccccccccccccc",
		oldest: "2026-06-19T08:07:06.000Z",
		version: "2026.06.19.08.07.06",
	},
];

const applyTemplates = async (input) => {
	let value = input;
	for (const template of templates) {
		value = await jsonata(template).evaluate(value);
	}
	return value;
};

const byDigest = (releases) => new Map(releases.map((release) => [release.digest, release]));

describe("github-branch-tip transformTemplates", () => {
	let releases;

	before(async () => {
		releases = (await applyTemplates(activity)).releases;
	});

	it("transform_templates_are_present_when_branch_tip_datasource_defined", () => {
		assert.ok(templates.length >= 1);
	});

	it("transform_templates_contain_no_handlebars_opener_when_branch_tip_datasource_defined", () => {
		for (const template of templates) {
			assert.ok(!template.includes("{{"), template);
		}
	});

	it("releases_exclude_all_zero_digest_when_activity_has_branch_deletion", () => {
		assert.ok(activity.some((record) => record.after === allZero));
		assert.ok(releases.every((release) => release.digest !== allZero));
	});

	it("releases_fold_duplicate_after_into_one_when_activity_has_repeated_after", () => {
		const digests = releases.map((release) => release.digest).sort();
		assert.deepEqual(
			digests,
			expectedReleases.map((expected) => expected.after),
		);
	});

	it("release_timestamp_is_oldest_timestamp_when_after_repeated", () => {
		const found = byDigest(releases);
		for (const expected of expectedReleases) {
			assert.equal(found.get(expected.after).releaseTimestamp, expected.oldest);
		}
	});

	it("release_version_is_utc_six_field_of_oldest_timestamp_when_timestamp_has_offset", () => {
		const found = byDigest(releases);
		for (const expected of expectedReleases) {
			assert.equal(found.get(expected.after).version, expected.version);
		}
	});

	it("release_version_matches_six_field_shape_when_activity_transformed", () => {
		for (const release of releases) {
			assert.match(release.version, /^\d{4}(\.\d{2}){5}$/);
		}
	});
});
