import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runSetupWizard } from "../src/setup-wizard.js";

function answerFrom(values) {
  return async (key) => values[key];
}

test("pauses at the official Obsidian install step when full memory is requested", async () => {
  const result = await runSetupWizard({
    ask: answerFrom({ obsidianInstalled: false, dashboardOnly: false }),
  });

  assert.deepEqual(result, {
    status: "needs-obsidian",
    downloadUrl: "https://obsidian.md/download",
  });
});

test("configures selected agents and syncs the user's empty vault", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agenting-os-wizard-"));
  const result = await runSetupWizard({
    ask: answerFrom({
      obsidianInstalled: true,
      vaultPath: path.join(root, "Vault"),
      appDataPath: path.join(root, "Data"),
      projectPath: path.join(root, "Project"),
      tools: ["codex", "claude", "gemini"],
      sources: {
        codex: path.join(root, "Codex Data"),
        claude: path.join(root, "Claude Data"),
        gemini: path.join(root, "Gemini Data"),
      },
      projectRoots: { launch: path.join(root, "Projects", "Launch") },
      priceBook: [],
      subscriptions: [],
      budgets: [],
      telemetryConsent: false,
      createStarterVault: true,
    }),
  });

  assert.equal(result.status, "ready");
  assert.deepEqual(result.adapters.sort(), ["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);
  const config = JSON.parse(await readFile(result.configPath, "utf8"));
  assert.deepEqual(config.telemetry, { enabled: false });
  assert.deepEqual(config.sources, {
    codex: path.join(root, "Codex Data"),
    claude: path.join(root, "Claude Data"),
    gemini: path.join(root, "Gemini Data"),
  });
  assert.deepEqual(config.projectRoots, {
    launch: path.join(root, "Projects", "Launch"),
  });
  assert.deepEqual(config.priceBook, []);
  assert.deepEqual(config.subscriptions, []);
  assert.deepEqual(config.budgets, []);
  assert.deepEqual(result.projects, []);
  assert.match(
    await readFile(path.join(root, "Vault", "Templates", "Project.md"), "utf8"),
    /## وضعیت فعلی/,
  );
});
