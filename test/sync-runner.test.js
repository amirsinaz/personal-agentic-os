import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initializePersonalWorkspace } from "../src/onboarding.js";
import { runIncrementalSync } from "../src/sync-runner.js";

test("reports incremental project changes and records the dashboard sync state",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-sync-"));
  const vaultPath=path.join(root,"Vault");
  const projectPath=path.join(vaultPath,"01-Projects","site");
  await mkdir(projectPath,{recursive:true});
  await writeFile(path.join(projectPath,"00-Index.md"),"---\nstatus: active\n---\n# Site\n");
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath,sources:{},connections:[{id:"codex",status:"configured",sync:"recurring"}],syncMode:"recurring"});

  const first=await runIncrementalSync(initialized.configPath,{now:"2026-08-29T10:00:00.000Z"});
  assert.deepEqual(first.changes,{created:["site"],updated:[],unchanged:[],removed:[]});

  await writeFile(path.join(projectPath,"00-Index.md"),"---\nstatus: paused\n---\n# Site\n");
  const second=await runIncrementalSync(initialized.configPath,{now:"2026-08-29T11:00:00.000Z"});
  assert.deepEqual(second.changes,{created:[],updated:["site"],unchanged:[],removed:[]});
  const state=JSON.parse(await readFile(second.statePath,"utf8"));
  assert.equal(state.lastSync.status,"completed");
  assert.equal(state.lastSync.at,"2026-08-29T11:00:00.000Z");
  assert.equal(state.lastSync.scanned,1);
  assert.equal(state.lastSync.changed,1);
  assert.equal(typeof state.syncLedger.projects.site,"string");
});

test("exposes the incremental sync command for recurring jobs",async()=>{
  const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
  assert.equal(pkg.scripts.sync,"node src/sync-cli.js");
  for(const file of ["com.personal-agentic-os.sync.plist.template","sync.cron.template","sync.ps1.template"]){
    const template=await readFile(new URL(`../ops/${file}`,import.meta.url),"utf8");
    assert.match(template,/CONFIG_PATH/);
    assert.match(template,/sync-cli\.js|npm run sync/);
  }
});

test("blocks sync when the installed version is below a required minimum",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-required-update-"));
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath:path.join(root,"Vault"),sources:{}});
  await writeFile(path.join(root,"Data","update-status.json"),JSON.stringify({requiredUpdate:true,latestVersion:"0.7.1",releaseUrl:"https://example.test/v0.7.1"}));
  await assert.rejects(runIncrementalSync(initialized.configPath),/required update/i);
});
