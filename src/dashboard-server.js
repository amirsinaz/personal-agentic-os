import http from "node:http";

import { renderDashboard } from "./dashboard.js";
import { syncPersonalData } from "./onboarding.js";

export function createDashboardServer(configPath) {
  return http.createServer(async (request, response) => {
    if (request.url !== "/") {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    try {
      const state = await syncPersonalData(configPath);
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(renderDashboard(state));
    } catch (error) {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end(`Dashboard sync failed: ${error.message}`);
    }
  });
}
