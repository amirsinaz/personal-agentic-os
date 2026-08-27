import { lstat, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".svg", ".ts", ".tsx", ".txt", ".yml", ".yaml"]);
const BLOCKED_NAMES = new Set([".env", ".git", ".obsidian", "node_modules"]);
const SECRET_PATTERNS = [
  { label: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "GitHub token", regex: /\bgh[oprsu]_[A-Za-z0-9_]{30,}\b/ },
  { label: "OpenAI-style key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { label: "credential assignment", regex: /\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[^\s"']{8,}/i },
  { label: "absolute macOS user path", regex: /\/Users\/[A-Za-z0-9._-]+\// },
  { label: "absolute Windows user path", regex: /[A-Za-z]:\\Users\\[^\\\s]+\\/i }
];

function assertRelativeSafe(value, label) {
  if (!value || path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
    throw new Error(`${label} must be a safe relative path: ${value}`);
  }
}

async function assertInside(root, target, label) {
  const resolvedRoot = await realpath(root);
  const resolvedTarget = path.resolve(resolvedRoot, target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error(`${label} escapes its allowed root`);
  return resolvedTarget;
}

async function collectFiles(root, relativeEntry) {
  assertRelativeSafe(relativeEntry, "mapping.from");
  const entry = await assertInside(root, relativeEntry, "mapping.from");
  const stat = await lstat(entry);
  if (stat.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${relativeEntry}`);
  if (stat.isFile()) return [{ absolute: entry, relative: path.basename(relativeEntry) }];
  if (!stat.isDirectory()) throw new Error(`Unsupported source type: ${relativeEntry}`);

  const results = [];
  async function walk(directory, prefix = "") {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      if (BLOCKED_NAMES.has(item.name)) continue;
      const relative = path.join(prefix, item.name);
      const absolute = path.join(directory, item.name);
      if (item.isSymbolicLink()) throw new Error(`Symlinks are not allowed: ${relative}`);
      if (item.isDirectory()) await walk(absolute, relative);
      else if (item.isFile()) results.push({ absolute, relative });
    }
  }
  await walk(entry);
  return results;
}

export function scanPublicText(text, filename) {
  if (!TEXT_EXTENSIONS.has(path.extname(filename).toLowerCase())) {
    throw new Error(`Binary or unsupported file requires manual review: ${filename}`);
  }
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(text)) throw new Error(`Privacy check failed (${pattern.label}): ${filename}`);
  }
}

export async function applyMappings({ sourceRoot, destinationRoot, mappings, check = false }) {
  const changed = [];
  for (const mapping of mappings) {
    assertRelativeSafe(mapping.to, "mapping.to");
    const files = await collectFiles(sourceRoot, mapping.from);
    const sourceIsFile = files.length === 1 && files[0].relative === path.basename(mapping.from);
    for (const file of files) {
      const destinationRelative = sourceIsFile ? mapping.to : path.join(mapping.to, file.relative);
      const destination = await assertInside(destinationRoot, destinationRelative, "mapping.to");
      const content = await readFile(file.absolute, "utf8");
      scanPublicText(content, destinationRelative);
      let previous = null;
      try { previous = await readFile(destination, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
      if (previous === content) continue;
      changed.push(destinationRelative);
      if (!check) {
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, content, "utf8");
      }
    }
  }
  return changed;
}
