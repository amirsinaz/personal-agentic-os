import path from "node:path";
import { runIncrementalSync } from "./sync-runner.js";

const configPath = process.argv[2];
if (!configPath || !path.isAbsolute(configPath)) throw new Error("Pass the absolute config.json path");
const result = await runIncrementalSync(configPath);
process.stdout.write(`${JSON.stringify({ status: result.lastSync.status, at: result.lastSync.at, changes: result.changes }, null, 2)}\n`);
