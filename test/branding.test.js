import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("public-facing package uses the Personal Agentic OS name",async()=>{
  for(const file of ["README.md","prompts/master-install.md","prompts/master-install-en.md","src/dashboard.js","src/onboarding.js","src/start-dashboard.js","docs/index.html"]){
    const source=await readFile(new URL(`../${file}`,import.meta.url),"utf8");
    assert.match(source,/Personal Agentic OS/);
    assert.doesNotMatch(source,/Personal Agentin[g] OS/);
  }
});

test("static fallback presents screenshots as a vertical flow, not a horizontal slider",async()=>{
  const source=await readFile(new URL("../docs/index.html",import.meta.url),"utf8");
  assert.doesNotMatch(source,/scroll-snap-type/);
  assert.match(source,/\.slides\{display:grid/);
});

test("master prompts cover the complete connection and continuous-memory funnel",async()=>{
  for(const file of ["master-install.md","master-install-en.md"]){
    const prompt=await readFile(new URL(`../prompts/${file}`,import.meta.url),"utf8");
    assert.match(prompt,/project candidates|کاندیداهای پروژه/i);
    assert.match(prompt,/canonical project map|نقشه‌ی نهایی پروژه‌ها/i);
    assert.match(prompt,/content markers|نشانه‌های محتوایی/i);
    assert.match(prompt,/recurring sync|همگام‌سازی مداوم/i);
    assert.match(prompt,/new tool|ابزار جدید/i);
    assert.match(prompt,/dashboard/i);
    assert.match(prompt,/context pack/i);
  }
});
