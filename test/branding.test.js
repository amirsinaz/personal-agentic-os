import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public-facing package uses the Personal Agentic OS name",async()=>{
  for(const file of ["README.md","prompts/master-install.md","prompts/master-install-en.md","src/dashboard.js","src/onboarding.js","src/start-dashboard.js","docs/index.html"]){
    const source=await readFile(new URL(`../${file}`,import.meta.url),"utf8");
    assert.doesNotMatch(source,/Personal Agenting OS/);
  }
});

test("static fallback presents screenshots as a vertical flow, not a horizontal slider",async()=>{
  const source=await readFile(new URL("../docs/index.html",import.meta.url),"utf8");
  assert.doesNotMatch(source,/scroll-snap-type/);
  assert.match(source,/\.slides\{display:grid/);
});
