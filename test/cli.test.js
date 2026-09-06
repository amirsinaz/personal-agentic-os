import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {mkdtemp,readFile,writeFile,mkdir} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {promisify} from "node:util";
import test from "node:test";

const execFileAsync=promisify(execFile);

test("the public CLI exposes setup, dashboard, sync, and update commands",async()=>{
  const {stdout}=await execFileAsync(process.execPath,[new URL("../src/cli.js",import.meta.url).pathname,"--help"]);
  assert.match(stdout,/npx personal-agentic-os@latest/);
  for(const command of ["setup","dashboard","sync","update"])assert.match(stdout,new RegExp(`\\b${command}\\b`));
});

test("the public CLI reports the package version without starting setup",async()=>{
  const {stdout}=await execFileAsync(process.execPath,[new URL("../src/cli.js",import.meta.url).pathname,"--version"]);
  assert.equal(stdout.trim(),"0.10.0");
});

test("the package is publishable through one npx binary and includes runtime assets",async()=>{
  const manifest=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
  assert.equal(manifest.private,false);
  assert.equal(manifest.bin["personal-agentic-os"],"src/cli.js");
  assert.deepEqual(manifest.files,["src","templates","prompts","ops","README.md","SECURITY.md","LICENSE"]);
  assert.equal(manifest.engines.node,">=20");
});

test("the verify command reads local state and returns an evidence-backed status",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-verify-"));
  const configPath=path.join(root,"config.json");
  await writeFile(configPath,"{}\n");
  await writeFile(path.join(root,"state.json"),JSON.stringify({projects:[],contextPacks:[],memoryHealth:{status:"healthy"},lastSync:{status:"completed",at:"2026-09-06T10:00:00.000Z",rejected:0}}));
  const {stdout}=await execFileAsync(process.execPath,[new URL("../src/cli.js",import.meta.url).pathname,"verify",configPath]);
  const report=JSON.parse(stdout);
  assert.equal(report.status,"healthy");
  assert.equal(report.checks.lastSyncAt,"2026-09-06T10:00:00.000Z");
});

test("the context command searches generated local packs and prints source-bearing matches",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-context-"));
  const vaultPath=path.join(root,"vault");
  await mkdir(path.join(vaultPath,"09-Exports"),{recursive:true});
  const configPath=path.join(root,"config.json");
  await writeFile(configPath,JSON.stringify({vaultPath}));
  await writeFile(path.join(vaultPath,"09-Exports","site.context.md"),"Decision: use passkeys for authentication\n");
  const {stdout}=await execFileAsync(process.execPath,[new URL("../src/cli.js",import.meta.url).pathname,"context",configPath,"تصمیم احراز هویت"]);
  assert.deepEqual(JSON.parse(stdout),[{path:"site.context.md",score:1,matchedTerms:["decisions","authentication"]}]);
});
