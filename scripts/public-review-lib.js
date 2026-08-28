import { createHash } from "node:crypto";
import path from "node:path";

const PRIVATE_SEGMENTS = ["01-Projects", "02-Global-Knowledge", "03-Sessions", "08-Reports", "09-Exports", ".obsidian", ".env"];
const CAPABILITIES = [
  { name: "Personal Agent Registry", matches: ["/agents/", "agent-registry"] },
  { name: "Cost intelligence", matches: ["/costs/", "cost-ledger", "token-economy"] },
  { name: "Operational memory", matches: ["/memory/", "context-pack", "operational-memory"] },
  { name: "Controlled optimization", matches: ["/optimization/", "recommendation"] },
  { name: "Sync reliability", matches: ["auto-sync", "/api/sync", "integrity"] },
  { name: "Public templates", matches: ["/templates/", "Templates/"] }
];

export function parsePorcelain(output) {
  const entries = output.split("\0").filter(Boolean);
  const files = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const status = entry.slice(0, 2);
    let file = entry.slice(3);
    if (status.includes("R") || status.includes("C")) file = entries[++index] ?? file;
    files.push({ status, file: file.replaceAll("\\", "/") });
  }
  return files;
}

export function buildReviewSummary(files) {
  const safe = files.filter(({ file }) => !PRIVATE_SEGMENTS.some((segment) => file.split("/").includes(segment) || file.includes(segment)));
  const excluded = files.length - safe.length;
  const capabilities = CAPABILITIES.filter(({ matches }) => safe.some(({ file }) => matches.some((match) => `/${file}`.includes(match)))).map(({ name }) => name);
  return { files: safe, excluded, capabilities: capabilities.length ? capabilities : ["Platform changes"] };
}

export function assertReviewSource(root) {
  if (!path.isAbsolute(root)) throw new Error("Review source root must be absolute");
}

export function buildReviewId(sources){
  return createHash("sha256").update(JSON.stringify(sources)).digest("hex").slice(0,12);
}

export function reviewStatusFor(previous, nextId) {
  return previous?.id === nextId && previous.status === "approved" ? "approved" : "pending";
}
