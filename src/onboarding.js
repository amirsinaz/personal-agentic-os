import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { syncUsageSources } from "./usage-importers.js";
import { calculateBudgetStatus, calculateCosts } from "./costs.js";
import { generateRecommendations } from "./recommendations.js";

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
  telemetryConsent = false,
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
  const usage = await syncUsageSources(configPath);
  const costs = calculateCosts({ usageRecords: usage.records, priceBook: config.priceBook ?? [], subscriptions: config.subscriptions ?? [] });
  const budgetStatus = calculateBudgetStatus({
    usageRecords: usage.records,
    priceBook: config.priceBook ?? [],
    budgets: config.budgets ?? [],
    asOf: new Date().toISOString(),
  });
  const recommendations = generateRecommendations({ usageRecords: usage.records, costs });
  const statePath = path.join(path.dirname(configPath), "state.json");
  await writeFile(statePath, `${JSON.stringify({ projects, usage: usage.providers, usageByProject: usage.byProject, costs, budgetStatus, recommendations }, null, 2)}\n`, "utf8");
  return { projects, usage: usage.providers, usageByProject: usage.byProject, costs, budgetStatus, recommendations, statePath };
}

const adapterFiles = {
  codex: "AGENTS.md",
  gemini: "GEMINI.md",
  claude: "CLAUDE.md",
};

const adapterInstructions = `# Personal Agentic OS

- Resolve project memory only through the local Agenting OS configuration.
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
