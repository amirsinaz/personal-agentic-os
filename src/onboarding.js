import { randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { syncUsageSources } from "./usage-importers.js";
import { calculateBudgetStatus, calculateCosts } from "./costs.js";
import { generateRecommendations } from "./recommendations.js";
import { buildAgentProfiles } from "./agent-registry.js";
import { auditOperationalMemory, buildPortableContextPack } from "./operational-memory.js";

function requireAbsolutePath(value, field) {
  if (!path.isAbsolute(value)) {
    throw new Error(`${field} must be an absolute path`);
  }
}

export async function initializePersonalWorkspace({
  appDataPath,
  vaultPath,
  sources,
  projectRoots = {},
  priceBook = [],
  subscriptions = [],
  budgets = [],
  connections = [],
  canonicalProjects = [],
  syncMode = "manual",
  telemetryConsent = false,
  installType = "full",
}) {
  requireAbsolutePath(appDataPath, "appDataPath");
  requireAbsolutePath(vaultPath, "vaultPath");
  for (const [name, sourcePath] of Object.entries(sources)) {
    requireAbsolutePath(sourcePath, `sources.${name}`);
  }
  for (const [name, projectPath] of Object.entries(projectRoots)) {
    requireAbsolutePath(projectPath, `projectRoots.${name}`);
  }

  const config = {
    vaultPath,
    sources,
    projectRoots,
    priceBook,
    subscriptions,
    budgets,
    connections,
    canonicalProjects,
    syncMode,
    installType,
    telemetry: telemetryConsent
      ? { enabled: true, installId: randomUUID() }
      : { enabled: false },
  };
  const configPath = path.join(appDataPath, "config.json");

  await mkdir(appDataPath, { recursive: true });
  await mkdir(vaultPath, { recursive: true });
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });

  return { config, configPath, createdExampleData: false };
}

function readField(source, field) {
  return source.match(new RegExp(`^${field}:\\s*(.+)$`, "m"))?.[1]?.trim();
}

export async function syncPersonalData(configPath) {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const projectsPath = path.join(config.vaultPath, "01-Projects");
  const entries = await readdir(projectsPath, { withFileTypes: true }).catch(() => []);
  const projects = [];

  for (const entry of entries.filter((item) => item.isDirectory())) {
    const source = await readFile(path.join(projectsPath, entry.name, "00-Index.md"), "utf8").catch(() => "");
    if (!source) continue;
    projects.push({
      id: entry.name,
      name: source.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name,
      status: readField(source, "status") || "unknown",
    });
  }

  projects.sort((left, right) => left.id.localeCompare(right.id));
  const agentObservationsPath = path.join(config.vaultPath, "04-Agents", "observations.json");
  const agentObservationsSource = await readFile(agentObservationsPath, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "[]";
    throw error;
  });
  const agentObservations = JSON.parse(agentObservationsSource);
  if (!Array.isArray(agentObservations)) throw new Error("Agent observations must be a JSON array");
  const agents = buildAgentProfiles(agentObservations);
  const usage = await syncUsageSources(configPath);
  const costs = calculateCosts({ usageRecords: usage.records, priceBook: config.priceBook ?? [], subscriptions: config.subscriptions ?? [] });
  const budgetStatus = calculateBudgetStatus({
    usageRecords: usage.records,
    priceBook: config.priceBook ?? [],
    budgets: config.budgets ?? [],
    asOf: new Date().toISOString(),
  });
  const recommendations = generateRecommendations({ usageRecords: usage.records, costs });
  const recordsPath=path.join(config.vaultPath,"02-Global-Knowledge","records.json");
  const records=JSON.parse(await readFile(recordsPath,"utf8").catch((error)=>error?.code==="ENOENT"?"[]":Promise.reject(error)));
  if(!Array.isArray(records))throw new Error("Knowledge records must be a JSON array");
  const exportsPath=path.join(config.vaultPath,"09-Exports");
  await mkdir(exportsPath,{recursive:true});
  const contextPacks=[];
  for(const project of projects){
    const pack=buildPortableContextPack({project,records});
    await writeFile(path.join(exportsPath,`${project.id}.context.md`),pack.markdown,{encoding:"utf8",mode:0o600});
    await writeFile(path.join(exportsPath,`${project.id}.context.json`),`${JSON.stringify({...pack,markdown:undefined},null,2)}\n`,{encoding:"utf8",mode:0o600});
    contextPacks.push(pack);
  }
  const memoryHealth=auditOperationalMemory({projects,records,packs:contextPacks});
  const statePath = path.join(path.dirname(configPath), "state.json");
  await writeFile(statePath, `${JSON.stringify({ projects, canonicalProjects: config.canonicalProjects ?? [], connections: config.connections ?? [], syncMode: config.syncMode ?? "manual", contextPacks:contextPacks.map((pack)=>({project:pack.project,generatedAt:pack.generatedAt})),memoryHealth,agents,usage: usage.providers, usageByProject: usage.byProject, costs, budgetStatus, recommendations }, null, 2)}\n`, {encoding:"utf8",mode:0o600});
  await chmod(statePath,0o600);
  return { projects, canonicalProjects: config.canonicalProjects ?? [], connections: config.connections ?? [], syncMode: config.syncMode ?? "manual", contextPacks,memoryHealth,agents,usage: usage.providers, usageByProject: usage.byProject, costs, budgetStatus, recommendations, statePath };
}

const adapterFiles = {
  codex: "AGENTS.md",
  gemini: "GEMINI.md",
  claude: "CLAUDE.md",
};

const adapterInstructions = `# Personal Agentic OS

- Resolve project memory only through the local Agentic OS configuration.
- Read the active project's context pack before continuing existing work.
- Preserve only verified state, accepted decisions, open questions, and next actions.
- Never store raw transcripts, hidden reasoning, credentials, or unrelated personal data.
- Keep all project content local unless the user explicitly approves a named destination.
- Telemetry consent never includes project names, prompts, paths, usage, cost, or Vault content.
`;

export async function installToolAdapters({ projectPath, tools }) {
  requireAbsolutePath(projectPath, "projectPath");
  const unsupported = tools.find((tool) => !(tool in adapterFiles));
  if (unsupported) throw new Error(`Unsupported tool adapter: ${unsupported}`);

  const created = [];
  for (const tool of [...new Set(tools)]) {
    const filename = adapterFiles[tool];
    await writeFile(path.join(projectPath, filename), adapterInstructions, {
      encoding: "utf8",
      flag: "wx",
    });
    created.push(filename);
  }
  return { created };
}

const starterDirectories = [
  "00-System",
  "01-Projects",
  "02-Global-Knowledge",
  "03-Sessions",
  "04-Agents",
  "08-Reports",
  "09-Exports",
  "Templates",
];

const projectTemplate = `---
type: project
status: active
---

# نام پروژه

## هدف

## وضعیت فعلی

## تصمیم‌ها

## پرسش‌های باز

## اقدام بعدی
`;

export async function createStarterVault(vaultPath) {
  requireAbsolutePath(vaultPath, "vaultPath");
  for (const directory of starterDirectories) {
    await mkdir(path.join(vaultPath, directory), { recursive: true });
  }

  const observationsPath = path.join(vaultPath, "04-Agents", "observations.json");
  try {
    await writeFile(observationsPath, "[]\n", { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
  }

  const skipped = [];
  const relativeTemplatePath = "Templates/Project.md";
  try {
    await writeFile(path.join(vaultPath, relativeTemplatePath), projectTemplate, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    skipped.push(relativeTemplatePath);
  }

  return {
    directories: starterDirectories,
    skipped,
    createdProjectData: false,
  };
}

export async function createCanonicalProjectIndexes(vaultPath, projects = []) {
  requireAbsolutePath(vaultPath, "vaultPath");
  const created = [];
  const skipped = [];
  for (const project of projects) {
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u.test(project.id)) throw new Error(`Unsafe canonical project id: ${project.id}`);
    const projectDirectory = path.join(vaultPath, "01-Projects", project.id);
    await mkdir(projectDirectory, { recursive: true });
    const projectPath = path.join(projectDirectory, "00-Index.md");
    const name = String(project.name || project.id).replace(/[\r\n]+/g, " ").trim();
    const tools = [...new Set(project.tools ?? [])].sort().join(", ");
    const content = `---\ntype: project\nstatus: active\ntools: ${tools}\nshared: ${Boolean(project.shared)}\n---\n\n# ${name}\n\n## وضعیت فعلی\n\nهنوز بررسی نشده است.\n\n## تصمیم‌ها\n\n## پرسش‌های باز\n\n## اقدام بعدی\n`;
    try {
      await writeFile(projectPath, content, { encoding: "utf8", flag: "wx" });
      created.push(project.id);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      skipped.push(project.id);
    }
  }
  return { created, skipped };
}
