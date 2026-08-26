import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initializePersonalWorkspace } from "../src/onboarding.js";
import {
  attributeUsageProject,
  parseUsageJsonl,
  syncUsageSources,
} from "../src/usage-importers.js";

test("uses the latest cumulative Codex token_count instead of summing snapshots", () => {
  const content = [
    { type: "session_meta", payload: { model: "gpt-test" } },
    { timestamp: "2026-01-01T10:00:00Z", type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 30, reasoning_output_tokens: 5, total_tokens: 130 } } } },
    { timestamp: "2026-01-01T10:05:00Z", type: "event_msg", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 250, cached_input_tokens: 50, output_tokens: 70, reasoning_output_tokens: 10, total_tokens: 320 } } } },
  ].map(JSON.stringify).join("\n");

  assert.deepEqual(parseUsageJsonl("codex", content, "session.jsonl"), {
    provider: "codex",
    model: "gpt-test",
    source: "session.jsonl",
    timestamp: "2026-01-01T10:05:00Z",
    inputTokens: 250,
    cachedInputTokens: 50,
    outputTokens: 70,
    reasoningTokens: 10,
    totalTokens: 320,
    measurement: "actual",
  });
});

test("sums exact Claude message usage fields", () => {
  const content = [
    { timestamp: "2026-01-01T10:00:00Z", message: { model: "claude-test", usage: { input_tokens: 40, cache_read_input_tokens: 10, output_tokens: 12 } } },
    { timestamp: "2026-01-01T10:01:00Z", message: { model: "claude-test", usage: { input_tokens: 60, cache_read_input_tokens: 5, output_tokens: 18 } } },
  ].map(JSON.stringify).join("\n");

  assert.deepEqual(parseUsageJsonl("claude", content, "conversation.jsonl"), {
    provider: "claude",
    model: "claude-test",
    source: "conversation.jsonl",
    timestamp: "2026-01-01T10:01:00Z",
    inputTokens: 100,
    cachedInputTokens: 15,
    outputTokens: 30,
    totalTokens: 130,
    measurement: "actual",
  });
});

test("reads Gemini usageMetadata when exact token fields exist", () => {
  const content = JSON.stringify({
    timestamp: "2026-01-01T10:00:00Z",
    modelVersion: "gemini-test",
    usageMetadata: { promptTokenCount: 90, candidatesTokenCount: 20, totalTokenCount: 110 },
  });

  assert.deepEqual(parseUsageJsonl("gemini", content, "session.jsonl"), {
    provider: "gemini",
    model: "gemini-test",
    source: "session.jsonl",
    timestamp: "2026-01-01T10:00:00Z",
    inputTokens: 90,
    outputTokens: 20,
    totalTokens: 110,
    measurement: "actual",
  });
});

test("returns unavailable rather than estimating missing usage", () => {
  assert.deepEqual(parseUsageJsonl("gemini", '{"message":"hello"}', "session.jsonl"), {
    provider: "gemini",
    source: "session.jsonl",
    measurement: "unavailable",
  });
});

test("syncs configured provider folders without persisting conversation text", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agentic-os-usage-"));
  const codexRoot = path.join(root, "codex");
  const geminiRoot = path.join(root, "gemini");
  const projectRoot = path.join(root, "projects", "launch");
  await mkdir(codexRoot);
  await mkdir(geminiRoot);
  await writeFile(path.join(codexRoot, "one.jsonl"), [
    JSON.stringify({ type: "session_meta", payload: { cwd: path.join(projectRoot, "app") } }),
    JSON.stringify({ type: "message", text: "private project secret" }),
    JSON.stringify({ timestamp: "2026-01-01T10:00:00Z", payload: { type: "token_count", info: { total_token_usage: { input_tokens: 80, output_tokens: 20, total_tokens: 100 } } } }),
  ].join("\n"));
  await writeFile(path.join(geminiRoot, "one.jsonl"), '{"message":"no exact usage"}\n');
  const initialized = await initializePersonalWorkspace({
    appDataPath: path.join(root, "data"),
    vaultPath: path.join(root, "vault"),
    sources: { codex: codexRoot, gemini: geminiRoot },
    projectRoots: { launch: projectRoot },
  });

  const result = await syncUsageSources(initialized.configPath);

  assert.deepEqual(result.providers, [
    { provider: "codex", measurement: "actual", files: 1, totalTokens: 100 },
    { provider: "gemini", measurement: "unavailable", files: 1 },
  ]);
  assert.equal(result.records[0].project, "launch");
  assert.deepEqual(result.byProject, [{ project: "launch", totalTokens: 100 }]);
  const persisted = await readFile(result.usagePath, "utf8");
  assert.doesNotMatch(persisted, /private project secret/);
  assert.doesNotMatch(persisted, new RegExp(projectRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("attributes usage only when the working directory is inside a confirmed project root", () => {
  const project = attributeUsageProject(
    { workingDirectory: "/work/client-a/apps/site" },
    { "client-a": "/work/client-a", "client-b": "/work/client-b" },
  );

  assert.equal(project, "client-a");
});

test("uses the most specific confirmed project root", () => {
  const project = attributeUsageProject(
    { workingDirectory: "/work/platform/mobile/src" },
    { platform: "/work/platform", mobile: "/work/platform/mobile" },
  );

  assert.equal(project, "mobile");
});

test("keeps unmatched or boundary-lookalike paths unassigned", () => {
  assert.equal(
    attributeUsageProject(
      { workingDirectory: "/work/client-a-copy" },
      { "client-a": "/work/client-a" },
    ),
    "Unassigned",
  );
  assert.equal(
    attributeUsageProject(
      { task: "Please work on client-a", workingDirectory: undefined },
      { "client-a": "/work/client-a" },
    ),
    "Unassigned",
  );
});
