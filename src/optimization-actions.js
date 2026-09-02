import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const adapterFiles = { codex: "AGENTS.md", claude: "CLAUDE.md", gemini: "GEMINI.md" };
const policy = `
<!-- agentic-os:lean-context:start -->
## Lean context policy

- For each task, load only the active project's index and directly relevant notes.
- Do not load unrelated project memory into context.
- Prefer targeted file search over reading entire folders.
- At handoff, preserve compact verified state instead of raw transcripts.
- Treat token or cost savings as unavailable until measured by a controlled comparison.
<!-- agentic-os:lean-context:end -->
`;

async function writeAtomic(filePath, content) {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, content, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

function requireConfirmation(confirmed) {
  if (confirmed !== true) throw new Error("Explicit confirmation is required");
}

export function evaluateOptimizationImpact({beforeRuns=[],afterRuns=[],minimumAfterRuns=5}){
  const exact=(runs)=>runs.map((run)=>run.tokens).filter((tokens)=>Number.isInteger(tokens)&&tokens>=0);
  const before=exact(beforeRuns);const after=exact(afterRuns);
  if(after.length<minimumAfterRuns||!before.length){return {status:"waiting",requiredRuns:minimumAfterRuns,observedRuns:after.length,measurement:"unavailable",causalSaving:"unavailable"};}
  const average=(values)=>values.reduce((sum,value)=>sum+value,0)/values.length;
  const beforeAverage=average(before);const afterAverage=average(after);
  return {status:"observed",requiredRuns:minimumAfterRuns,observedRuns:after.length,measurement:"actual",beforeAverage:Number(beforeAverage.toFixed(2)),afterAverage:Number(afterAverage.toFixed(2)),changePercent:beforeAverage===0?0:Number((((afterAverage-beforeAverage)/beforeAverage)*100).toFixed(2)),causalSaving:"unavailable"};
}

export async function previewOptimization({ projectPath, tools }) {
  if (!path.isAbsolute(projectPath)) throw new Error("projectPath must be an absolute path");
  const unsupported = tools.find((tool) => !(tool in adapterFiles));
  if (unsupported) throw new Error(`Unsupported tool adapter: ${unsupported}`);

  const changes = [];
  for (const tool of [...new Set(tools)]) {
    const file = adapterFiles[tool];
    const absolutePath = path.join(projectPath, file);
    const before = await readFile(absolutePath, "utf8");
    const after = before.includes("agentic-os:lean-context:start")
      ? before
      : `${before.trimEnd()}\n${policy}`;
    changes.push({ file, before, after });
  }
  return {
    id: randomUUID(),
    status: "preview",
    projectPath,
    changes,
    expectedSaving: { measurement: "unavailable" },
  };
}

export async function applyOptimization({ preview, confirmed }) {
  requireConfirmation(confirmed);
  if (preview?.status !== "preview" || !path.isAbsolute(preview.projectPath)) throw new Error("Invalid preview");

  for (const change of preview.changes) {
    if (!Object.values(adapterFiles).includes(change.file)) throw new Error("Invalid adapter target");
    const current = await readFile(path.join(preview.projectPath, change.file), "utf8");
    if (current !== change.before) throw new Error(`Adapter changed after preview: ${change.file}`);
  }

  const auditDirectory = path.join(preview.projectPath, ".agentic-os", "changes");
  const auditPath = path.join(auditDirectory, `${preview.id}.json`);
  await mkdir(auditDirectory, { recursive: true });
  await writeAtomic(auditPath, `${JSON.stringify({ ...preview, status: "applying" }, null, 2)}\n`);
  for (const change of preview.changes) {
    await writeAtomic(path.join(preview.projectPath, change.file), change.after);
  }
  await writeAtomic(auditPath, `${JSON.stringify({ ...preview, status: "applied" }, null, 2)}\n`);
  return { status: "applied", auditPath };
}

export async function rollbackOptimization({ auditPath, confirmed }) {
  requireConfirmation(confirmed);
  if (!path.isAbsolute(auditPath)) throw new Error("auditPath must be an absolute path");
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  if (audit.status !== "applied") throw new Error("Optimization is not applied");
  if (!path.isAbsolute(audit.projectPath)) throw new Error("Invalid audit project path");
  const expectedDirectory=path.join(path.resolve(audit.projectPath),".agentic-os","changes");
  if(path.dirname(path.resolve(auditPath))!==expectedDirectory)throw new Error("Audit file is outside the project change log");

  for (const change of audit.changes) {
    const current = await readFile(path.join(audit.projectPath, change.file), "utf8");
    if (current !== change.after) throw new Error(`Adapter changed after apply: ${change.file}`);
  }
  for (const change of audit.changes) {
    await writeAtomic(path.join(audit.projectPath, change.file), change.before);
  }
  await writeAtomic(auditPath, `${JSON.stringify({ ...audit, status: "rolled-back" }, null, 2)}\n`);
  return { status: "rolled-back", auditPath };
}
