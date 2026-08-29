import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initializePersonalWorkspace } from "../src/onboarding.js";
import { createDashboardServer } from "../src/dashboard-server.js";

function fetchText(port) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}`, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve(body));
    }).on("error", reject);
  });
}

function fetchResponse(port) {
  return new Promise((resolve,reject)=>{http.get(`http://127.0.0.1:${port}`,(response)=>{response.resume();response.on("end",()=>resolve(response));}).on("error",reject);});
}

test("refreshes dashboard data from the configured vault on every request", async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-dashboard-"));
  const vaultPath = path.join(root, "Vault");
  const projectPath = path.join(vaultPath, "01-Projects", "launch");
  await mkdir(projectPath, { recursive: true });
  const sourcePath = path.join(projectPath, "00-Index.md");
  await writeFile(sourcePath, "---\nstatus: active\n---\n# نسخه اول\n");
  const initialized = await initializePersonalWorkspace({
    appDataPath: path.join(root, "Data"),
    vaultPath,
    sources: {},
  });
  const server = createDashboardServer(initialized.configPath);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  context.after(() => server.close());
  const port = server.address().port;

  assert.match(await fetchText(port), /نسخه اول/);
  await writeFile(sourcePath, "---\nstatus: active\n---\n# نسخه دوم\n");
  assert.match(await fetchText(port), /نسخه دوم/);
  const response=await fetchResponse(port);
  assert.equal(response.headers["x-frame-options"],"DENY");
  assert.match(response.headers["content-security-policy"],/frame-ancestors 'none'/);
});

test("shows the required-update screen without syncing local data",async(context)=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-dashboard-required-"));
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath:path.join(root,"Vault"),sources:{}});
  await writeFile(path.join(root,"Data","update-status.json"),JSON.stringify({requiredUpdate:true,latestVersion:"0.7.1",message:"Critical repair",releaseUrl:"https://example.test/v0.7.1"}));
  const server=createDashboardServer(initialized.configPath);
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));context.after(()=>server.close());
  const body=await fetchText(server.address().port);
  assert.match(body,/به‌روزرسانی ضروری/);
  assert.match(body,/Critical repair/);
});
