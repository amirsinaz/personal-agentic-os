import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createCanonicalProjectIndexes,
  createStarterVault,
  initializePersonalWorkspace,
  installToolAdapters,
  syncPersonalData,
} from "../src/onboarding.js";

test("creates a local workspace from user-provided paths with telemetry disabled", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));
  const vaultPath = path.join(root, "My Vault");
  const codexPath = path.join(root, ".codex");

  const result = await initializePersonalWorkspace({
    appDataPath: path.join(root, "app-data"),
    vaultPath,
    sources: { codex: codexPath },
  });

  assert.equal(result.config.telemetry.enabled, false);
  if(process.platform!=="win32")assert.equal((await stat(result.configPath)).mode&0o777,0o600);
  assert.equal("installId" in result.config.telemetry, false);
  assert.equal(result.config.vaultPath, vaultPath);
  assert.deepEqual(result.config.sources, { codex: codexPath });
  assert.equal(result.createdExampleData, false);

  const saved = JSON.parse(await readFile(result.configPath, "utf8"));
  assert.deepEqual(saved, result.config);
});

test("records explicit telemetry consent without collecting project data", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));

  const result = await initializePersonalWorkspace({
    appDataPath: path.join(root, "app-data"),
    vaultPath: path.join(root, "Vault"),
    sources: {},
    telemetryConsent: true,
  });

  assert.equal(result.config.telemetry.enabled, true);
  assert.match(result.config.telemetry.installId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(Object.keys(result.config.telemetry).sort(), ["enabled", "installId"]);
});

test("rejects relative paths so personal data cannot resolve inside the package", async () => {
  await assert.rejects(
    initializePersonalWorkspace({
      appDataPath: "./data",
      vaultPath: "./vault",
      sources: {},
    }),
    /absolute path/i,
  );
});

test("rebuilds project state from the user's vault after a local edit", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));
  const vaultPath = path.join(root, "Vault");
  const projectPath = path.join(vaultPath, "01-Projects", "Website");
  await mkdir(projectPath, { recursive: true });
  await writeFile(
    path.join(projectPath, "00-Index.md"),
    "---\nstatus: active\n---\n# Website refresh\n",
  );
  const initialized = await initializePersonalWorkspace({
    appDataPath: path.join(root, "app-data"),
    vaultPath,
    sources: {},
  });

  const first = await syncPersonalData(initialized.configPath);
  assert.deepEqual(first.projects, [{ id: "Website", name: "Website refresh", status: "active" }]);

  await writeFile(
    path.join(projectPath, "00-Index.md"),
    "---\nstatus: paused\n---\n# Website refresh\n",
  );
  const second = await syncPersonalData(initialized.configPath);
  assert.equal(second.projects[0].status, "paused");

  const saved = JSON.parse(await readFile(second.statePath, "utf8"));
  assert.deepEqual(saved.projects, second.projects);
});

test("syncs only explicit agent observations from the local registry",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"personal-agentic-os-agents-"));
  const vaultPath=path.join(root,"Vault");
  await mkdir(path.join(vaultPath,"04-Agents"),{recursive:true});
  await writeFile(path.join(vaultPath,"04-Agents","observations.json"),JSON.stringify([{agentId:"codex",agentType:"primary-agent",project:"launch",observedAt:"2026-08-24T10:00:00Z",sourceSession:"session-1",sourcePath:"local/session-1",evidence:{name:"Codex",responsibility:"Implementation",tool:"Codex",skills:["tdd"]}}]));
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"app-data"),vaultPath,sources:{}});
  const state=await syncPersonalData(initialized.configPath);
  assert.equal(state.agents.length,1);
  assert.equal(state.agents[0].project,"launch");
  assert.equal(state.agents[0].responsibility,"Implementation");
});

test("installs context adapters only for the AI tools selected by the user", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));

  const result = await installToolAdapters({
    projectPath: root,
    tools: ["codex", "gemini"],
  });

  assert.deepEqual(result.created.sort(), ["AGENTS.md", "GEMINI.md"]);
  assert.match(await readFile(path.join(root, "AGENTS.md"), "utf8"), /local Agentic OS configuration/);
  assert.match(await readFile(path.join(root, "GEMINI.md"), "utf8"), /local Agentic OS configuration/);
  await assert.rejects(readFile(path.join(root, "CLAUDE.md"), "utf8"), { code: "ENOENT" });
});

test("rejects unsupported AI tool adapters", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));
  await assert.rejects(
    installToolAdapters({ projectPath: root, tools: ["unknown-agent"] }),
    /unsupported tool/i,
  );
});

test("creates an empty starter vault without project data", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));
  const vaultPath = path.join(root, "Vault");

  const result = await createStarterVault(vaultPath);

  assert.equal(result.createdProjectData, false);
  assert.deepEqual(result.directories, [
    "00-System",
    "01-Projects",
    "02-Global-Knowledge",
    "03-Sessions",
    "04-Agents",
    "08-Reports",
    "09-Exports",
    "Templates",
  ]);
  assert.deepEqual(JSON.parse(await readFile(path.join(vaultPath,"04-Agents","observations.json"),"utf8")),[]);
  const template = await readFile(path.join(vaultPath, "Templates", "Project.md"), "utf8");
  assert.match(template, /status: active/);
  assert.match(template, /## اقدام بعدی/);
  assert.doesNotMatch(template, /Website|AdLab|Personal/);
});

test("does not overwrite an existing user template", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "personal-agentic-os-"));
  const templatePath = path.join(root, "Vault", "Templates", "Project.md");
  await mkdir(path.dirname(templatePath), { recursive: true });
  await writeFile(templatePath, "# قالب شخصی من\n");

  const result = await createStarterVault(path.join(root, "Vault"));

  assert.deepEqual(result.skipped, ["Templates/Project.md"]);
  assert.equal(await readFile(templatePath, "utf8"), "# قالب شخصی من\n");
});

test("creates approved canonical project indexes without copying raw conversations",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-canonical-"));
  const vaultPath=path.join(root,"Vault");
  const result=await createCanonicalProjectIndexes(vaultPath,[{id:"site",name:"Site",tools:["codex","gemini"],shared:true,matchReason:"repository",roots:["/private/a","/private/b"]}]);
  assert.deepEqual(result.created,["site"]);
  const content=await readFile(path.join(vaultPath,"01-Projects","site","00-Index.md"),"utf8");
  assert.match(content,/tools: codex, gemini/);
  assert.match(content,/shared: true/);
  assert.doesNotMatch(content,/\/private\/a|\/private\/b|transcript/i);
});
