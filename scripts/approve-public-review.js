import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewPath = path.join(repoRoot, ".public-review/pending.json");
const proposal = JSON.parse(await readFile(reviewPath, "utf8"));
const requestedId = process.argv[2];
if (!requestedId || requestedId !== proposal.id) throw new Error("Pass the exact pending review ID to approve it");
proposal.status = "approved";
proposal.approvedAt = new Date().toISOString();
await writeFile(reviewPath, `${JSON.stringify(proposal, null, 2)}\n`, { mode: 0o600 });
console.log(`Approved for public adaptation: ${proposal.id}. No files were published automatically.`);
