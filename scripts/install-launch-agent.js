import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localConfig = JSON.parse(await readFile(path.join(repoRoot, ".sync-public.local.json"), "utf8"));
if (!path.isAbsolute(localConfig.sourceRoot)) throw new Error("sourceRoot must be absolute");

const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const template = await readFile(path.join(repoRoot, "ops/com.personal-agentic-os.public-sync.plist"), "utf8");
const plist = template
  .replaceAll("__NODE_PATH__", escapeXml(process.execPath))
  .replaceAll("__REPO_ROOT__", escapeXml(repoRoot))
  .replaceAll("__PRIVATE_TEMPLATES_PATH__", escapeXml(path.join(localConfig.sourceRoot, "00-System/Templates")));
const launchAgents = path.join(os.homedir(), "Library/LaunchAgents");
const destination = path.join(launchAgents, "com.personal-agentic-os.public-sync.plist");
await mkdir(launchAgents, { recursive: true });
await writeFile(destination, plist, { mode: 0o600 });
console.log(destination);
