import assert from "node:assert/strict";
import {mkdtemp,readFile,writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {checkForUpdate} from "../src/update-check.js";

test("records a newer public version locally and sends only consented version telemetry",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-update-"));
  const configPath=path.join(root,"config.json");
  await writeFile(configPath,JSON.stringify({telemetry:{enabled:true,installId:"4f92ab79-7bda-4fb4-a66f-86f1afed2d9d"},installType:"full"}));
  const calls=[];
  const result=await checkForUpdate({configPath,currentVersion:"0.2.0",platform:"darwin",manifestUrl:"https://example.test/version.json",telemetryEndpoint:"https://example.test/api/version-check",fetchImpl:async(url,options)=>{calls.push({url,options});return url.endsWith("version.json")?{ok:true,json:async()=>({version:"0.3.0",releaseUrl:"https://example.test/releases/v0.3.0"})}:{ok:true};}});
  assert.equal(result.updateAvailable,true);
  assert.deepEqual(JSON.parse(calls[1].options.body),{installId:"4f92ab79-7bda-4fb4-a66f-86f1afed2d9d",version:"0.2.0",platform:"darwin",installType:"full"});
  const saved=JSON.parse(await readFile(path.join(root,"update-status.json"),"utf8"));
  assert.equal(saved.latestVersion,"0.3.0");
});

test("does not send version telemetry without consent",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-update-"));
  const configPath=path.join(root,"config.json");
  await writeFile(configPath,JSON.stringify({telemetry:{enabled:false},installType:"full"}));
  const calls=[];
  await checkForUpdate({configPath,currentVersion:"0.3.0",platform:"linux",manifestUrl:"https://example.test/version.json",telemetryEndpoint:"https://example.test/api/version-check",fetchImpl:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({version:"0.3.0",releaseUrl:"https://example.test/releases/v0.3.0"})};}});
  assert.equal(calls.length,1);
});
