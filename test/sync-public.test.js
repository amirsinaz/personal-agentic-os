import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyMappings, scanPublicText } from "../scripts/sync-public-lib.js";

test("copies only explicitly mapped public files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "public-sync-"));
  const source = path.join(root, "private");
  const destination = path.join(root, "public");
  await mkdir(path.join(source, "approved"), { recursive: true });
  await mkdir(destination);
  await writeFile(path.join(source, "approved", "template.md"), "# Generic template\n");
  await writeFile(path.join(source, "private-project.md"), "must stay private\n");

  const changed = await applyMappings({ sourceRoot: source, destinationRoot: destination, mappings: [{ from: "approved", to: "templates" }] });
  assert.deepEqual(changed, [path.join("templates", "template.md")]);
  assert.equal(await readFile(path.join(destination, "templates", "template.md"), "utf8"), "# Generic template\n");
  await assert.rejects(readFile(path.join(destination, "private-project.md")), /ENOENT/);
});

test("check mode reports drift without writing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "public-sync-check-"));
  const source = path.join(root, "source");
  const destination = path.join(root, "destination");
  await mkdir(source); await mkdir(destination);
  await writeFile(path.join(source, "prompt.md"), "new\n");
  await writeFile(path.join(destination, "prompt.md"), "old\n");
  const changed = await applyMappings({ sourceRoot: source, destinationRoot: destination, mappings: [{ from: "prompt.md", to: "prompt.md" }], check: true });
  assert.deepEqual(changed, ["prompt.md"]);
  assert.equal(await readFile(path.join(destination, "prompt.md"), "utf8"), "old\n");
});

test("privacy scan blocks secrets and personal absolute paths", () => {
  assert.throws(() => scanPublicText("api_key=super-secret-value", "config.md"), /Privacy check failed/);
  assert.throws(() => scanPublicText("/Users/person/private-vault", "notes.md"), /Privacy check failed/);
});

test("source traversal is rejected", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "public-sync-path-"));
  await assert.rejects(applyMappings({ sourceRoot: root, destinationRoot: root, mappings: [{ from: "../private", to: "safe" }] }), /safe relative path/);
});
