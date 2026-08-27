import { open, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lockPath = path.join(repoRoot, ".sync-public.lock");

function run(command, args, { allowNoChanges = false } = {}) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: "inherit" });
  if (allowNoChanges && result.status === 1) return false;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
  return true;
}

let lock;
try {
  lock = await open(lockPath, "wx");
} catch (error) {
  if (error.code === "EEXIST") process.exit(0);
  throw error;
}

try {
  run(process.execPath, ["scripts/sync-public.js"]);
  run(process.execPath, ["--test", "test/sync-public.test.js"]);
  run("git", ["add", "--", "templates"]);
  const hasChanges = !run("git", ["diff", "--cached", "--quiet", "--", "templates"], { allowNoChanges: true });
  if (hasChanges) {
    run("git", ["commit", "-m", "chore: sync public templates"]);
  } else {
    console.log("No approved public template changes to publish.");
  }
  run("git", ["push", "origin", "HEAD"]);
} finally {
  await lock?.close();
  await rm(lockPath, { force: true });
}
