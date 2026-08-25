import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyOptimization,
  previewOptimization,
  rollbackOptimization,
} from "../src/optimization-actions.js";

test("previews the lean context policy without changing adapter files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agenting-os-preview-"));
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
  const root = await mkdtemp(path.join(os.tmpdir(), "agenting-os-confirm-"));
  await writeFile(path.join(root, "CLAUDE.md"), "# Existing instructions\n");
  const preview = await previewOptimization({ projectPath: root, tools: ["claude"] });

  await assert.rejects(applyOptimization({ preview, confirmed: false }), /explicit confirmation/i);
  assert.equal(await readFile(path.join(root, "CLAUDE.md"), "utf8"), "# Existing instructions\n");
});

test("applies the reviewed policy and rolls back to the exact prior content", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agenting-os-rollback-"));
  const adapterPath = path.join(root, "GEMINI.md");
  await writeFile(adapterPath, "# Personal rules\n");
  const preview = await previewOptimization({ projectPath: root, tools: ["gemini"] });

  const applied = await applyOptimization({ preview, confirmed: true });
  assert.match(await readFile(adapterPath, "utf8"), /agenting-os:lean-context:start/);
  assert.equal(applied.status, "applied");

  const rolledBack = await rollbackOptimization({ auditPath: applied.auditPath, confirmed: true });
  assert.equal(rolledBack.status, "rolled-back");
  assert.equal(await readFile(adapterPath, "utf8"), "# Personal rules\n");
});
