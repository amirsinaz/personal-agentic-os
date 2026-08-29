import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runSetupWizard } from "../src/setup-wizard.js";

function answerFrom(values) {
  return async (key) => values[key];
}

test("pauses at the official Obsidian install step when full memory is requested", async () => {
  const result = await runSetupWizard({
    ask: answerFrom({ obsidianInstalled: false, dashboardOnly: false }),
  });

  assert.deepEqual(result, {
    status: "needs-obsidian",
    downloadUrl: "https://obsidian.md/download",
  });
});

test("configures selected agents and syncs the user's empty vault", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-wizard-"));
  const result = await runSetupWizard({
    ask: answerFrom({
      obsidianInstalled: true,
      vaultPath: path.join(root, "Vault"),
      appDataPath: path.join(root, "Data"),
      projectPath: path.join(root, "Project"),
      tools: ["codex", "claude", "gemini"],
      sources: {
        codex: path.join(root, "Codex Data"),
        claude: path.join(root, "Claude Data"),
        gemini: path.join(root, "Gemini Data"),
      },
      projectRoots: { launch: path.join(root, "Projects", "Launch") },
      projectCandidates: [],
      syncMode: "manual",
      priceBook: [],
      subscriptions: [],
      budgets: [],
      telemetryConsent: false,
      createStarterVault: true,
      approvePlan: true,
    }),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.telemetryStatus, "disabled");
  assert.deepEqual(result.adapters.sort(), ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
  const config = JSON.parse(await readFile(result.configPath, "utf8"));
  assert.deepEqual(config.telemetry, { enabled: false });
  assert.deepEqual(config.sources, {
    codex: path.join(root, "Codex Data"),
    claude: path.join(root, "Claude Data"),
    gemini: path.join(root, "Gemini Data"),
  });
  assert.deepEqual(config.projectRoots, {
    launch: path.join(root, "Projects", "Launch"),
  });
  assert.deepEqual(config.priceBook, []);
  assert.deepEqual(config.subscriptions, []);
  assert.deepEqual(config.budgets, []);
  assert.deepEqual(result.projects, []);
  assert.deepEqual(result.connections.map((item)=>item.id), ["claude", "codex", "gemini"]);
  assert.match(
    await readFile(path.join(root, "Vault", "Templates", "Project.md"), "utf8"),
    /## وضعیت فعلی/,
  );
});

test("shows the canonical project map and stops before writing without approval",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-preview-"));
  const result=await runSetupWizard({ask:answerFrom({
    obsidianInstalled:true,
    vaultPath:path.join(root,"Vault"),appDataPath:path.join(root,"Data"),projectPath:path.join(root,"Project"),
    tools:["codex","gemini"],sources:{codex:path.join(root,"Codex"),gemini:path.join(root,"Gemini")},projectRoots:{},
    projectCandidates:[
      {tool:"codex",path:path.join(root,"work","site"),name:"Site",repository:"https://example.com/site.git",markers:["launch","design"]},
      {tool:"gemini",path:path.join(root,"copies","site"),name:"Site copy",repository:"https://example.com/site.git",markers:["launch","design"]},
    ],
    syncMode:"recurring",priceBook:[],subscriptions:[],budgets:[],telemetryConsent:false,createStarterVault:true,approvePlan:false,
  })});
  assert.equal(result.status,"review-required");
  assert.equal(result.preview.connections.length,2);
  assert.equal(result.preview.projects.length,1);
  assert.equal(result.preview.projects[0].shared,true);
  await assert.rejects(readFile(path.join(root,"Data","config.json"),"utf8"),{code:"ENOENT"});
});

test("the interactive CLI asks for discovery evidence, sync mode, and final approval",async()=>{
  const source=await readFile(new URL("../src/setup-cli.js",import.meta.url),"utf8");
  assert.match(source,/projectCandidates:/);
  assert.match(source,/syncMode:/);
  assert.match(source,/approvePlan:/);
  assert.match(source,/review-required/);
});

test("approved canonical projects enter memory and appear in dashboard state",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-transfer-"));
  const result=await runSetupWizard({ask:answerFrom({
    obsidianInstalled:true,vaultPath:path.join(root,"Vault"),appDataPath:path.join(root,"Data"),projectPath:path.join(root,"Project"),
    tools:["codex","gemini"],sources:{},projectRoots:{},projectCandidates:[
      {tool:"codex",path:path.join(root,"one"),name:"Shared project",repository:"https://example.com/shared.git",markers:["brief","roadmap"]},
      {tool:"gemini",path:path.join(root,"two"),name:"Shared project",repository:"https://example.com/shared.git",markers:["brief","roadmap"]},
    ],syncMode:"recurring",priceBook:[],subscriptions:[],budgets:[],telemetryConsent:false,createStarterVault:true,approvePlan:true,
  })});
  assert.equal(result.status,"ready");
  assert.equal(result.projects.length,1);
  assert.equal(result.projects[0].name,"Shared project");
  assert.equal(result.canonicalProjects[0].shared,true);
  assert.equal(result.syncMode,"recurring");
  assert.equal(result.lastSync.status,"completed");
});
