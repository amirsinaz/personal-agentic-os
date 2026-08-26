import path from "node:path";

import { createDashboardServer } from "./dashboard-server.js";

const configPath = process.argv[2];
if (!configPath || !path.isAbsolute(configPath)) {
  throw new Error("Pass the absolute config path: npm run dashboard -- /absolute/path/config.json");
}

const port = Number(process.env.PORT || 4310);
const server = createDashboardServer(configPath);
server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Personal Agentic OS: http://127.0.0.1:${port}\n`);
});
