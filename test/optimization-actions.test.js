import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyOptimization,
  evaluateOptimizationImpact,
  previewOptimization,
  rollbackOptimization,
} from "../src/optimization-actions.js";

test("waits for enough matching runs before reporting post-apply impact",()=>{
  assert.deepEqual(evaluateOptimizationImpact({beforeRuns:[{tokens:100},{tokens:80}],afterRuns:[{tokens:60},{tokens:70}],minimumAfterRuns:5}),{status:"waiting",requiredRuns:5,observedRuns:2,measurement:"unavailable",causalSaving:"unavailable"});
  assert.deepEqual(evaluateOptimizationImpact({beforeRuns:[{tokens:100},{tokens:80}],afterRuns:[{tokens:60},{tokens:70},{tokens:50},{tokens:60},{tokens:60}],minimumAfterRuns:5}),{status:"observed",requiredRuns:5,observedRuns:5,measurement:"actual",beforeAverage:90,afterAverage:60,changePercent:-33.33,causalSaving:"unavailable"});
});

test("previews the lean context policy without changing adapter files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-preview-"));
  const adapterPath = path.join(root, "AGENTS.md");
  await writeFile(adapterPath, "# Existing instructions\n");

  const preview = await previewOptimization({ projectPath: root, tools: ["codex"] });

  assert.equal(await readFile(adapterPath, "utf8"), "# Existing instructions\n");
  assert.equal(preview.status, "preview");
  assert.equal(preview.changes[0].file, "AGENTS.md");
  assert.match(preview.changes[0].after, /active project's index/);
  assert.deepEqual(preview.expectedSaving, { measurement: "unavailable" });
});

test("requires explicit confirmation before applying a preview", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-confirm-"));
  await writeFile(path.join(root, "CLAUDE.md"), "# Existing instructions\n");
  const preview = await previewOptimization({ projectPath: root, tools: ["claude"] });

  await assert.rejects(applyOptimization({ preview, confirmed: false }), /explicit confirmation/i);
  assert.equal(await readFile(path.join(root, "CLAUDE.md"), "utf8"), "# Existing instructions\n");
});

test("applies the reviewed policy and rolls back to the exact prior content", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-rollback-"));
  const adapterPath = path.join(root, "GEMINI.md");
  await writeFile(adapterPath, "# Personal rules\n");
  const preview = await previewOptimization({ projectPath: root, tools: ["gemini"] });

  const applied = await applyOptimization({ preview, confirmed: true });
  assert.match(await readFile(adapterPath, "utf8"), /agentic-os:lean-context:start/);
  assert.equal(applied.status, "applied");

  const rolledBack = await rollbackOptimization({ auditPath: applied.auditPath, confirmed: true });
  assert.equal(rolledBack.status, "rolled-back");
  assert.equal(await readFile(adapterPath, "utf8"), "# Personal rules\n");
});

test("rejects a rollback audit outside the project change log",async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),"agentic-os-audit-"));
  const projectPath=path.join(root,"project");
  await mkdir(projectPath,{recursive:true});
  const auditPath=path.join(root,"untrusted.json");
  await writeFile(auditPath,JSON.stringify({status:"applied",projectPath,changes:[]}));
  await assert.rejects(()=>rollbackOptimization({auditPath,confirmed:true}),/outside the project change log/);
});
