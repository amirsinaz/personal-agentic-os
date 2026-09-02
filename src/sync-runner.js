import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { syncPersonalData } from "./onboarding.js";

function comparable(project) {
  return JSON.stringify({ id: project.id, name: project.name, status: project.status });
}

function fingerprint(project){return createHash("sha256").update(comparable(project)).digest("hex");}

export function auditSyncIntegrity({projects=[],ledger={}}){
  const current=Object.fromEntries(projects.map((project)=>[project.id,fingerprint(project)]));
  const missing=Object.keys(current).filter((id)=>!(id in ledger)).sort();
  const changed=Object.keys(current).filter((id)=>id in ledger&&ledger[id]!==current[id]).sort();
  const removed=Object.keys(ledger).filter((id)=>!(id in current)).sort();
  return {status:missing.length||changed.length||removed.length?"needs-review":"healthy",missing,changed,removed,current};
}

export async function runIncrementalSync(configPath, { now = new Date().toISOString() } = {}) {
  const statePath = path.join(path.dirname(configPath), "state.json");
  const updateStatus=JSON.parse(await readFile(path.join(path.dirname(configPath),"update-status.json"),"utf8").catch((error)=>error?.code==="ENOENT"?"{}":Promise.reject(error)));
  if(updateStatus.requiredUpdate===true)throw new Error(`Required update: ${updateStatus.latestVersion??"new release"} ${updateStatus.releaseUrl??""}`.trim());
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
