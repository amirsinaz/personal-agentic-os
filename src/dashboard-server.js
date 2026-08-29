import http from "node:http";

import { readFile } from "node:fs/promises";
import path from "node:path";
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
      const release=JSON.parse(await readFile(path.join(path.dirname(configPath),"update-status.json"),"utf8").catch(()=>"{}"));
      const state=release.requiredUpdate===true
        ? JSON.parse(await readFile(path.join(path.dirname(configPath),"state.json"),"utf8").catch(()=>"{\"projects\":[]}"))
        : await syncPersonalData(configPath);
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "referrer-policy": "no-referrer",
      });
      response.end(renderDashboard(state,release));
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Dashboard sync failed. Check the local terminal for details.");
    }
  });
}
