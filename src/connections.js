import path from "node:path";

const supportedTools = new Set(["codex", "claude", "gemini"]);

export function buildConnectionRegistry({ tools = [], sources = {} }) {
  return [...new Set(tools)].filter((tool) => supportedTools.has(tool)).sort().map((id) => ({
    id,
    ...(sources[id] ? { source: sources[id], status: "configured" } : { status: "needs-source" }),
    sync: "manual",
  }));
}

function normalizedRepository(value = "") {
  return value.trim().toLowerCase().replace(/^git@([^:]+):/, "https://$1/").replace(/^git\+/, "").replace(/\.git\/?$/, "").replace(/\/$/, "");
}

function markerMatch(left, right) {
  const a = new Set((left.markers ?? []).map((item) => String(item).trim().toLowerCase()).filter(Boolean));
  const b = new Set((right.markers ?? []).map((item) => String(item).trim().toLowerCase()).filter(Boolean));
  const overlap = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return overlap >= 2 && union > 0 && overlap / union >= 0.67;
}

function matchReason(left, right) {
  if (path.resolve(left.path) === path.resolve(right.path)) return "same-path";
  const leftRepository = normalizedRepository(left.repository);
  const rightRepository = normalizedRepository(right.repository);
  if (leftRepository && leftRepository === rightRepository) return "repository";
  if (markerMatch(left, right)) return "content-markers";
  return null;
}

function slug(value) {
  return String(value || "project").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "project";
}

export function identifyCanonicalProjects(candidates = []) {
  const parent = candidates.map((_, index) => index);
  const reasons = new Map();
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const join = (left, right, reason) => {
    const a = find(left); const b = find(right);
    if (a !== b) parent[b] = a;
    reasons.set(`${Math.min(left, right)}:${Math.max(left, right)}`, reason);
  };

  for (let left = 0; left < candidates.length; left++) {
    for (let right = left + 1; right < candidates.length; right++) {
      const reason = matchReason(candidates[left], candidates[right]);
      if (reason) join(left, right, reason);
    }
  }

  const groups = new Map();
  candidates.forEach((candidate, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push({ ...candidate, index });
  });

  return [...groups.values()].map((items) => {
    const tools = [...new Set(items.map((item) => item.tool))].sort();
    const pairReasons = [];
    for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
      const reason = reasons.get(`${Math.min(items[left].index, items[right].index)}:${Math.max(items[left].index, items[right].index)}`);
      if (reason) pairReasons.push(reason);
    }
    const reasonPriority = ["same-path", "repository", "content-markers"];
    return {
      id: slug(items[0].name || path.basename(items[0].path)),
      name: items[0].name || path.basename(items[0].path),
      tools,
      roots: [...new Set(items.map((item) => path.resolve(item.path)))],
      shared: tools.length > 1,
      matchReason: reasonPriority.find((reason) => pairReasons.includes(reason)) ?? "single-source",
    };
  });
}
