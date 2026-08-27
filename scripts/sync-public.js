import { access, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { applyMappings } from "./sync-public-lib.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localConfigPath = path.join(repoRoot, ".sync-public.local.json");
const baseConfig = JSON.parse(await readFile(path.join(repoRoot, "public-sync.json"), "utf8"));
let localConfig = {};
try { await access(localConfigPath); localConfig = JSON.parse(await readFile(localConfigPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
const config = { ...baseConfig, ...localConfig };
const check = process.argv.includes("--check");
const publish = process.argv.includes("--publish");
const siteRoot = path.resolve(repoRoot, config.siteRoot);

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
}

const publicChanges = config.sourceRoot && config.privateMappings?.length
  ? await applyMappings({ sourceRoot: config.sourceRoot, destinationRoot: repoRoot, mappings: config.privateMappings, check })
  : [];
const siteChanges = await applyMappings({ sourceRoot: repoRoot, destinationRoot: siteRoot, mappings: config.siteMappings ?? [], check });

if (check && (publicChanges.length || siteChanges.length)) {
  console.error(`Public sync is out of date:\n${[...publicChanges, ...siteChanges].map((file) => `- ${file}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(publicChanges.length || siteChanges.length ? `Synced ${publicChanges.length + siteChanges.length} public file(s).` : "Public files are already in sync.");
}

if (publish) {
  if (check) throw new Error("--check and --publish cannot be combined");
  run("npm", ["test"], repoRoot);
  run("npm", ["test"], siteRoot);
  run("npm", ["run", "lint"], siteRoot);
  run("npm", ["run", "build"], siteRoot);
  console.log("Validation passed. Review the Git diffs, then commit and push each repository.");
}
