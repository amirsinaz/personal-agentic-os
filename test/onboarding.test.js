import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
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
    "08-Reports",
    "09-Exports",
    "Templates",
  ]);
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
