import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { syncPersonalData } from "./onboarding.js";

function comparable(project) {
  return JSON.stringify({ id: project.id, name: project.name, status: project.status });
}

function fingerprint(project){return createHash("sha256").update(comparable(project)).digest("hex");}

export async function runIncrementalSync(configPath, { now = new Date().toISOString() } = {}) {
  const statePath = path.join(path.dirname(configPath), "state.json");
  const previous = JSON.parse(await readFile(statePath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "{\"projects\":[]}";
    throw error;
  }));
  const current = await syncPersonalData(configPath);
  const before = new Map((previous.projects ?? []).map((project) => [project.id, project]));
  const after = new Map(current.projects.map((project) => [project.id, project]));
  const changes = { created: [], updated: [], unchanged: [], removed: [] };
  for (const [id, project] of after) {
    if (!before.has(id)) changes.created.push(id);
    else if (comparable(before.get(id)) !== comparable(project)) changes.updated.push(id);
    else changes.unchanged.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) changes.removed.push(id);
  const saved = JSON.parse(await readFile(current.statePath, "utf8"));
  saved.syncLedger={projects:Object.fromEntries([...after].map(([id,project])=>[id,fingerprint(project)]))};
  saved.lastSync = { at: now, status: "completed", scanned:after.size, changed:changes.created.length+changes.updated.length+changes.removed.length, imported:changes.created.length+changes.updated.length, skipped:changes.unchanged.length, rejected:0, changes };
  await writeFile(current.statePath, `${JSON.stringify(saved, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return { ...current, changes, lastSync: saved.lastSync };
}
