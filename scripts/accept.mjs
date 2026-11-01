import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const WINDOW_DAYS = 7;
const WINDOW_SECONDS = WINDOW_DAYS * 86400;
const ZERO_SHA = "0".repeat(40);

const usage = `usage:
  accept.mjs config <out-path>
  accept.mjs annotations <flake.nix>
  accept.mjs judge <scratch-dir> [--now <epoch>]`;

const fail = (message) => {
	process.stderr.write(`${message}\n`);
	process.exit(1);
};

// Reads each "# renovate:" line as a set of space-separated key=value pairs.
const parseAnnotations = (text) =>
	text
		.split("\n")
		.filter((line) => /^\s*#\s*renovate:/.test(line))
		.map((line) => line.replace(/^\s*#\s*renovate:\s*/, ""))
		.map((line) => {
			const annotation = {};
			for (const token of line.split(" ").filter((t) => t.length > 0)) {
				const [key, value] = token.split("=");
				annotation[key] = value;
			}
			return annotation;
		});

const epoch = (iso) => Math.floor(Date.parse(iso) / 1000);

const todate = (seconds) => new Date(seconds * 1000).toISOString().replace(/\.\d+Z$/, "Z");

const dotted = (iso) => iso.replace(/[-:T]/g, ".").replace(/Z$/, "");

const versionOf = (seconds) => dotted(todate(seconds));

const parseJsonLines = (text) =>
	text
		.split("\n")
		.filter((line) => line.startsWith("{"))
		.map((line) => JSON.parse(line));

const runConfig = (args) => {
	const [outPath] = args;
	if (!outPath) fail(usage);
	const preset = JSON.parse(readFileSync(join(root, "extends", "nix.json"), "utf8"));
	delete preset.$schema;
	writeFileSync(
		outPath,
		JSON.stringify({
			...preset,
			minimumReleaseAge: `${WINDOW_DAYS} days`,
			onboarding: false,
		}),
	);
};

const runAnnotations = (args) => {
	const [path] = args;
	if (!path) fail(usage);
	if (!existsSync(path)) fail(`accept:annotations: no such file: ${path}`);
	const lines = parseAnnotations(readFileSync(path, "utf8")).map(
		(a) => `${a.depName}\t${a.packageName}\t${a.branch}\n`,
	);
	process.stdout.write(lines.join(""));
};

const excludedReasons = (page, now) => {
	const timestamps = page.map((entry) => epoch(entry.timestamp));
	const reasons = [];
	if (page.length === 100 && Math.min(...timestamps) >= now - WINDOW_SECONDS) {
		reasons.push("bad-1");
	}
	const counts = new Map();
	for (const entry of page) {
		if (entry.after != null && entry.after !== ZERO_SHA) {
			counts.set(entry.after, (counts.get(entry.after) ?? 0) + 1);
		}
	}
	if (Math.max(0, ...counts.values()) >= 2) reasons.push("bad-5");
	return reasons.join(",");
};

const releaseAt = (page, version) => {
	const firstSeen = new Map();
	for (const entry of page) {
		if (entry.after == null || entry.after === ZERO_SHA) continue;
		const seconds = epoch(entry.timestamp);
		firstSeen.set(entry.after, Math.min(firstSeen.get(entry.after) ?? seconds, seconds));
	}
	const match = [...firstSeen.entries()]
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([, seconds]) => seconds)
		.find((seconds) => versionOf(seconds) === version);
	return match === undefined ? "" : todate(match);
};

const sedLast = (text, key, trailingSpace) =>
	text.replace(new RegExp(`.* ${key}=([^ ]*)${trailingSpace ? " " : ""}.*`), "$1");

const compareDep = (ctx, annotation) => {
	const { depName: dep, version } = annotation;
	const { lookupRows, planLines, branches, now } = ctx;
	const page = JSON.parse(readFileSync(join(ctx.scratch, `page-${dep}.json`), "utf8"));
	const excluded = excludedReasons(page, now);
	const row = lookupRows.find((r) => r.depName === dep);
	const plan = planLines.find((line) => line.startsWith(`input=${dep} `));
	if (row === undefined || plan === undefined) {
		return { text: `${dep}|-|missing lookup row or plan line|MISMATCH`, verdict: "MISMATCH" };
	}
	const planResult = sedLast(plan, "result", false);
	const planRev = sedLast(plan, "rev", true);
	const planValue = dotted(sedLast(plan, "tip_at", true));
	const curDigest = String(row.currentDigest ?? "null");
	const updates = row.updates ?? [];
	const updateCount = updates.length;
	const pinUpdate = planRev === curDigest.slice(0, 12) ? "no" : "yes";

	if (excluded !== "") {
		return {
			text: `${dep}|excluded:${excluded}|pin=${pinUpdate} plan=${planRev} lookup_updates=${updateCount}|SKIP`,
			verdict: "SKIP",
		};
	}

	let verdict = "ok";
	let detail = "";
	let updating = false;
	if (planResult !== "ok") {
		verdict = "MISMATCH";
		detail = `plan result ${planResult}`;
	} else if (pinUpdate === "no") {
		const release = releaseAt(page, version);
		const lookupAt = `${row.currentVersionTimestamp == null ? "" : row.currentVersionTimestamp.slice(0, 19)}Z`;
		if (updateCount !== 0) {
			verdict = "MISMATCH";
			detail = `lookup has ${updateCount} update(s), pin has none`;
		} else if (release !== lookupAt) {
			verdict = "MISMATCH";
			detail = `currentVersionTimestamp ${lookupAt} vs release ${release || "not-on-page-1"}`;
		} else {
			detail = `current ${lookupAt}`;
		}
	} else {
		updating = true;
		const first = updates[0] ?? {};
		const newValue = first.newValue ?? "";
		const newDigest = String(first.newDigest ?? "").slice(0, 12);
		const releaseTs = first.releaseTimestamp ?? "";
		const updateBranch = first.branchName ?? "";
		const releaseEpoch = Number.isNaN(Date.parse(releaseTs)) ? 0 : epoch(releaseTs);
		const prefix = `renovate/${dep}-`;
		const branchCount = branches.filter((b) => b.startsWith(prefix) && !b.endsWith("-digest")).length;
		if (updateCount !== 1) {
			verdict = "MISMATCH";
			detail = `lookup has ${updateCount} update(s), pin has one`;
		} else if (newValue !== planValue || newDigest !== planRev) {
			verdict = "MISMATCH";
			detail = `lookup ${newValue} ${newDigest} vs pin ${planValue} ${planRev}`;
		} else if (releaseEpoch > now - WINDOW_SECONDS) {
			verdict = "MISMATCH";
			detail = `releaseTimestamp ${releaseTs} is within ${WINDOW_DAYS} days of the run`;
		} else if (branchCount !== 1) {
			verdict = "MISMATCH";
			detail = `${branchCount} version branch(es) for ${dep} (${updateBranch})`;
		} else {
			detail = `${newValue} ${newDigest} release ${releaseTs} branch ${updateBranch}`;
		}
	}
	return {
		text: `${dep}|-|pin=${pinUpdate} plan=${planRev} lookup_updates=${updateCount} ${detail}|${verdict}`,
		verdict,
		updating,
	};
};

const runJudge = (args) => {
	const scratch = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--now");
	if (!scratch) fail(usage);
	const nowIndex = args.indexOf("--now");
	const now = nowIndex === -1 ? Math.floor(Date.now() / 1000) : Number(args[nowIndex + 1]);
	if (!Number.isInteger(now)) fail("accept:judge: --now needs an integer epoch");

	const inputs = ["lookup.out", "lookup.err", "plan.txt", join("src", "flake.nix")];
	const missing = inputs.filter((name) => !existsSync(join(scratch, name)));
	if (missing.length > 0) fail(`accept:judge: missing input file: ${missing.join(", ")}`);

	const annotations = parseAnnotations(readFileSync(join(scratch, "src", "flake.nix"), "utf8"));
	const missingPages = annotations
		.map((a) => `page-${a.depName}.json`)
		.filter((name) => !existsSync(join(scratch, name)));
	if (missingPages.length > 0) fail(`accept:judge: missing input file: ${missingPages.join(", ")}`);

	const lookupRows = readFileSync(join(scratch, "lookup.out"), "utf8")
		.split("\n")
		.filter((line) => line.trim() !== "")
		.map((line) => JSON.parse(line));
	const branches =
		parseJsonLines(readFileSync(join(scratch, "lookup.err"), "utf8")).find((o) => "branches" in o)
			?.branches ?? [];
	const planLines = readFileSync(join(scratch, "plan.txt"), "utf8").split("\n");
	process.stderr.write(`accept:compare: branches ${JSON.stringify(branches)}\n`);

	const ctx = { scratch, lookupRows, planLines, branches, now };
	const results = annotations.map((annotation) => compareDep(ctx, annotation));
	const digestBranches = branches.filter((b) => b.endsWith("-digest"));
	const branchesRow =
		digestBranches.length > 0
			? {
					text: `(branches)|-|digest branches present ${JSON.stringify(digestBranches)}|MISMATCH`,
					verdict: "MISMATCH",
				}
			: { text: `(branches)|-|no digest branch in ${JSON.stringify(branches)}|ok`, verdict: "ok" };
	const rows = [...results, branchesRow];

	process.stdout.write("accept:compare: dep|exclusion|observation|verdict\n");
	process.stdout.write(rows.map((r) => `accept:compare: ${r.text}\n`).join(""));

	if (!results.some((r) => r.updating)) {
		fail(
			"accept:compare: no non-excluded dep has an update in devkit-flake-pin; the comparison proves nothing",
		);
	}
	if (rows.some((r) => r.verdict === "MISMATCH")) {
		fail("accept:compare: mismatch between the preset and devkit-flake-pin");
	}
	process.stdout.write("accept:compare: all compared deps match\n");
};

const [subcommand, ...rest] = process.argv.slice(2);
const subcommands = { config: runConfig, annotations: runAnnotations, judge: runJudge };
if (!Object.hasOwn(subcommands, subcommand)) fail(usage);
subcommands[subcommand](rest);
