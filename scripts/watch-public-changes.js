import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(process.execPath, ["scripts/build-public-review.js"], { cwd: repoRoot, stdio: "inherit" });
if (result.status !== 0) process.exit(result.status ?? 1);
