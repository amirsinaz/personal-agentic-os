import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

function postForm(port,pathName,fields,{origin=`http://127.0.0.1:${port}`}={}){
  const body=new URLSearchParams(fields).toString();
  return new Promise((resolve,reject)=>{
    const request=http.request({hostname:"127.0.0.1",port,path:pathName,method:"POST",headers:{origin,"content-type":"application/x-www-form-urlencoded","content-length":Buffer.byteLength(body)}},(response)=>{response.resume();response.on("end",()=>resolve(response));});
    request.on("error",reject);request.end(body);
  });
}

function postMultipart(port,pathName,{filename,content,enabled="on"}){
  const boundary="agentic-os-test-boundary";
  const body=Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="enabled"\r\n\r\n${enabled}\r\n--${boundary}\r\nContent-Disposition: form-data; name="conversationFile"; filename="${filename}"\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--\r\n`);
  return new Promise((resolve,reject)=>{const request=http.request({hostname:"127.0.0.1",port,path:pathName,method:"POST",headers:{origin:`http://127.0.0.1:${port}`,"content-type":`multipart/form-data; boundary=${boundary}`,"content-length":body.length}},(response)=>{response.resume();response.on("end",()=>resolve(response));});request.on("error",reject);request.end(body);});
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

test("accepts a clarification answer and persists it as verified memory",async(context)=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-answer-"));
  const vaultPath=path.join(root,"Vault");
  await mkdir(path.join(vaultPath,"01-Projects","site"),{recursive:true});
  await writeFile(path.join(vaultPath,"01-Projects","site","00-Index.md"),"---\nstatus: active\n---\n# Site\n");
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath,sources:{}});
  const server=createDashboardServer(initialized.configPath);
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));context.after(()=>server.close());
  const port=server.address().port;
  await fetchText(port);
  const response=await postForm(port,"/clarifications",{questionId:"missing:project:site:goal",answer:"Ship the reliable MVP"});
  assert.equal(response.statusCode,303);
  const records=JSON.parse(await readFile(path.join(vaultPath,"02-Global-Knowledge","records.json"),"utf8"));
  assert.ok(records.some((item)=>item.type==="Goal"&&item.content==="Ship the reliable MVP"&&item.verified===true));
  const pack=await readFile(path.join(vaultPath,"09-Exports","site.context.md"),"utf8");
  assert.match(pack,/Ship the reliable MVP/);
});

test("rejects cross-origin writes to the local dashboard",async(context)=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-origin-"));
  const vaultPath=path.join(root,"Vault");
  await mkdir(path.join(vaultPath,"01-Projects","site"),{recursive:true});
  await writeFile(path.join(vaultPath,"01-Projects","site","00-Index.md"),"---\nstatus: active\n---\n# Site\n");
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath,sources:{}});
  const server=createDashboardServer(initialized.configPath);
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));context.after(()=>server.close());
  await fetchText(server.address().port);
  const response=await postForm(server.address().port,"/clarifications",{questionId:"missing:project:site:goal",answer:"Injected goal"},{origin:"https://malicious.example"});
  assert.equal(response.statusCode,403);
  const records=JSON.parse(await readFile(path.join(vaultPath,"02-Global-Knowledge","records.json"),"utf8").catch((error)=>error.code==="ENOENT"?"[]":Promise.reject(error)));
  assert.equal(records.length,0);
});

test("configures and imports a conversation source from the dashboard",async(context)=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-memory-source-"));const vaultPath=path.join(root,"Vault");
  await mkdir(path.join(vaultPath,"01-Projects","site"),{recursive:true});await writeFile(path.join(vaultPath,"01-Projects","site","00-Index.md"),"---\nstatus: active\n---\n# Site\n");
  const initialized=await initializePersonalWorkspace({appDataPath:path.join(root,"Data"),vaultPath,sources:{}});
  const extract=async()=>({candidates:[{id:"decision-upload",type:"Decision",project:"site",content:"Use SQLite",confidence:.8,sourceConversation:"chat-1"}]});
  const server=createDashboardServer(initialized.configPath,{extract});await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));context.after(()=>server.close());
  const exported=JSON.stringify([{id:"chat-1",title:"Decision",mapping:{a:{message:{author:{role:"user"},content:{parts:["Use SQLite"]}}}}}]);
  const response=await postMultipart(server.address().port,"/memory-sources",{filename:"conversations.json",content:exported});
  assert.equal(response.statusCode,303);
  const config=JSON.parse(await readFile(initialized.configPath,"utf8"));
  assert.equal(config.memoryExtraction.enabled,true);assert.equal(config.memoryExtraction.conversationSources.length,1);
  const records=JSON.parse(await readFile(path.join(vaultPath,"02-Global-Knowledge","records.json"),"utf8"));assert.ok(records.some((item)=>item.id==="decision-upload"));
});
