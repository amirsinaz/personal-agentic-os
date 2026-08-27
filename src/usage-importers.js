function lines(content) {
  return content.split(/\r?\n/).flatMap((line) => {
    try { return line.trim() ? [JSON.parse(line)] : []; }
    catch { return []; }
  });
}

function token(value) {
  return Number.isInteger(value) && value >= 0 ? value : undefined;
}

function unavailable(provider, source) {
  return { provider, source, measurement: "unavailable" };
}

function workingDirectoryFrom(records) {
  for (const record of records) {
    const candidate = record?.payload?.cwd ?? record?.session?.cwd ?? record?.cwd ?? record?.projectPath;
    if (typeof candidate === "string" && path.isAbsolute(candidate)) return candidate;
  }
  return undefined;
}

function modelFrom(records) {
  const models = new Set(records.flatMap((record) => {
    const candidate = record?.payload?.model ?? record?.message?.model ?? record?.modelVersion ?? record?.response?.modelVersion ?? record?.model;
    return typeof candidate === "string" && candidate.trim() ? [candidate.trim()] : [];
  }));
  return models.size === 1 ? [...models][0] : undefined;
}

export function attributeUsageProject(record, projectRoots = {}) {
  if (!record.workingDirectory || !path.isAbsolute(record.workingDirectory)) return "Unassigned";
  const workingDirectory = path.resolve(record.workingDirectory);
  const matches = Object.entries(projectRoots).filter(([, root]) => {
    if (!path.isAbsolute(root)) return false;
    const resolvedRoot = path.resolve(root);
    return workingDirectory === resolvedRoot || workingDirectory.startsWith(`${resolvedRoot}${path.sep}`);
  });
  matches.sort((left, right) => path.resolve(right[1]).length - path.resolve(left[1]).length);
  return matches[0]?.[0] ?? "Unassigned";
}

function parseCodex(records, source) {
  let found;
  const workingDirectory = workingDirectoryFrom(records);
  const model = modelFrom(records);
  for (const record of records) {
    const usage = record?.payload?.type === "token_count"
      ? record.payload?.info?.total_token_usage
      : undefined;
    if (token(usage?.input_tokens) === undefined || token(usage?.output_tokens) === undefined || token(usage?.total_tokens) === undefined) continue;
    found = {
      provider: "codex",
      ...(model ? { model } : {}),
      source,
      timestamp: record.timestamp,
      inputTokens: usage.input_tokens,
      cachedInputTokens: token(usage.cached_input_tokens) ?? 0,
      outputTokens: usage.output_tokens,
      reasoningTokens: token(usage.reasoning_output_tokens) ?? 0,
      totalTokens: usage.total_tokens,
      measurement: "actual",
      ...(workingDirectory ? { workingDirectory } : {}),
    };
  }
  return found ?? unavailable("codex", source);
}

function parseClaude(records, source) {
  let inputTokens = 0;
  let cachedInputTokens = 0;
  let outputTokens = 0;
  let timestamp;
  let count = 0;
  for (const record of records) {
    const usage = record?.message?.usage ?? record?.usage;
    const input = token(usage?.input_tokens);
    const output = token(usage?.output_tokens);
    if (input === undefined || output === undefined) continue;
    inputTokens += input;
    cachedInputTokens += token(usage.cache_read_input_tokens) ?? 0;
    outputTokens += output;
    timestamp = record.timestamp ?? timestamp;
    count++;
  }
  const workingDirectory = workingDirectoryFrom(records);
  const model = modelFrom(records);
  return count ? {
    provider: "claude", ...(model ? { model } : {}), source, timestamp, inputTokens, cachedInputTokens,
    outputTokens, totalTokens: inputTokens + outputTokens, measurement: "actual",
    ...(workingDirectory ? { workingDirectory } : {}),
  } : unavailable("claude", source);
}

function parseGemini(records, source) {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let timestamp;
  let count = 0;
  for (const record of records) {
    const usage = record?.usageMetadata ?? record?.response?.usageMetadata;
    const input = token(usage?.promptTokenCount);
    const output = token(usage?.candidatesTokenCount);
    const total = token(usage?.totalTokenCount);
    if (input === undefined || output === undefined || total === undefined) continue;
    inputTokens += input;
    outputTokens += output;
    totalTokens += total;
    timestamp = record.timestamp ?? timestamp;
    count++;
  }
  const workingDirectory = workingDirectoryFrom(records);
  const model = modelFrom(records);
  return count ? {
    provider: "gemini", ...(model ? { model } : {}), source, timestamp, inputTokens, outputTokens,
    totalTokens, measurement: "actual",
    ...(workingDirectory ? { workingDirectory } : {}),
  } : unavailable("gemini", source);
}

export function parseUsageJsonl(provider, content, source) {
  const records = lines(content);
  if (provider === "codex") return parseCodex(records, source);
  if (provider === "claude") return parseClaude(records, source);
  if (provider === "gemini") return parseGemini(records, source);
  throw new Error(`Unsupported usage provider: ${provider}`);
}

async function jsonlFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await jsonlFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(target);
  }
  return files.sort();
}

export async function syncUsageSources(configPath) {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  const providers = [];
  const records = [];

  for (const [provider, root] of Object.entries(config.sources ?? {}).sort()) {
    if (!["codex", "claude", "gemini"].includes(provider)) continue;
    const files = await jsonlFiles(root);
    const parsed = await Promise.all(files.map(async (file) =>
      parseUsageJsonl(provider, await readFile(file, "utf8"), path.relative(root, file)),
    ));
    const actual = parsed.filter((record) => record.measurement === "actual");
    records.push(...actual.map((record) => {
      const { workingDirectory, ...safeRecord } = record;
      return { ...safeRecord, project: attributeUsageProject(record, config.projectRoots) };
    }));
    providers.push(actual.length ? {
      provider,
      measurement: "actual",
      files: files.length,
      totalTokens: actual.reduce((sum, record) => sum + record.totalTokens, 0),
    } : {
      provider,
      measurement: "unavailable",
      files: files.length,
    });
  }

  const totalsByProject = new Map();
  for (const record of records) {
    totalsByProject.set(record.project, (totalsByProject.get(record.project) ?? 0) + record.totalTokens);
  }
  const byProject = Array.from(totalsByProject, ([project, totalTokens]) => ({ project, totalTokens }))
    .sort((left, right) => right.totalTokens - left.totalTokens || left.project.localeCompare(right.project));

  const usagePath = path.join(path.dirname(configPath), "usage.json");
  await writeFile(usagePath, `${JSON.stringify({ providers, byProject, records }, null, 2)}\n`, {encoding:"utf8",mode:0o600});
  await chmod(usagePath,0o600);
  return { providers, byProject, records, usagePath };
}
import { chmod, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
