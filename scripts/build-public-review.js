import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertReviewSource, buildReviewSummary, parsePorcelain } from "./public-review-lib.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(repoRoot, ".sync-public.local.json"), "utf8"));
const reviewRoot = path.join(repoRoot, ".public-review");
const detected = [];
for (const source of config.reviewSources ?? []) {
  assertReviewSource(source.root);
  const result = spawnSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: source.root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Could not inspect ${source.label}`);
  const summary = buildReviewSummary(parsePorcelain(result.stdout));
  if (summary.files.length || summary.excluded) detected.push({ label: source.label, ...summary });
}
if (!detected.length) {
  console.log("No private-system changes are waiting for public review.");
  process.exit(0);
}
const fingerprint = JSON.stringify(detected.map(({ label, files }) => [label, files]));
const id = createHash("sha256").update(fingerprint).digest("hex").slice(0, 12);
const proposal = { id, status: "pending", detectedAt: new Date().toISOString(), sources: detected };
const lines = [`# Public release review ${id}`, "", "Status: pending — publishing is blocked until explicit approval.", ""];
for (const source of detected) lines.push(`## ${source.label}`, "", `Capabilities: ${source.capabilities.join(", ")}`, `Files safe to review: ${source.files.length}`, `Private paths excluded: ${source.excluded}`, "", ...source.files.map(({ status, file }) => `- \`${status.trim() || "M"}\` ${file}`), "");
await mkdir(reviewRoot, { recursive: true });
await writeFile(path.join(reviewRoot, "pending.json"), `${JSON.stringify(proposal, null, 2)}\n`, { mode: 0o600 });
await writeFile(path.join(reviewRoot, "pending.md"), `${lines.join("\n")}\n`, { mode: 0o600 });
console.log(`Public review pending: ${id}`);
