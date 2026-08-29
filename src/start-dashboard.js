import path from "node:path";

import { createDashboardServer } from "./dashboard-server.js";
import { checkForUpdate } from "./update-check.js";
import { CURRENT_VERSION,RELEASE_MANIFEST_URL,VERSION_TELEMETRY_URL } from "./version.js";

const configPath = process.argv[2];
if (!configPath || !path.isAbsolute(configPath)) {
  throw new Error("Pass the absolute config path: npm run dashboard -- /absolute/path/config.json");
}

const port = Number(process.env.PORT || 4310);
await checkForUpdate({configPath,currentVersion:CURRENT_VERSION,platform:process.platform,manifestUrl:RELEASE_MANIFEST_URL,telemetryEndpoint:VERSION_TELEMETRY_URL}).catch(()=>null);
const server = createDashboardServer(configPath);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Personal Agentic OS: http://127.0.0.1:${port}\n`);
});
