import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {readFile} from "node:fs/promises";
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
  assert.equal(stdout.trim(),"0.8.0");
});

test("the package is publishable through one npx binary and includes runtime assets",async()=>{
  const manifest=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
  assert.equal(manifest.private,false);
  assert.equal(manifest.bin["personal-agentic-os"],"src/cli.js");
  assert.deepEqual(manifest.files,["src","templates","prompts","ops","README.md","SECURITY.md","LICENSE"]);
  assert.equal(manifest.engines.node,">=20");
});
