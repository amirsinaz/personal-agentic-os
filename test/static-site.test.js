import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("GitHub Pages fallback links to both prompts and the repository", async () => {
  const page = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
  assert.match(page, /master-install\.md/);
  assert.match(page, /master-install-en\.md/);
  assert.match(page, /github\.com\/amirsinaz\/personal-agentic-os/);
  assert.match(page, /lang="fa"/);
  assert.match(page, /lang="en"/);
});
