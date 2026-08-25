import assert from "node:assert/strict";
import test from "node:test";

import { sendInstallSuccess } from "../src/telemetry.js";

test("does not call the network when telemetry is disabled", async () => {
  let called = false;
  const result = await sendInstallSuccess({
    telemetry: { enabled: false }, endpoint: "https://example.test/api/install",
    fetchImpl: async () => { called = true; },
  });
  assert.equal(called, false);
  assert.deepEqual(result, { status: "disabled" });
});

test("sends only the approved anonymous install fields after consent", async () => {
  let captured;
  const result = await sendInstallSuccess({
    telemetry: { enabled: true, installId: "4f92ab79-7bda-4fb4-a66f-86f1afed2d9d" },
    endpoint: "https://example.test/api/install", version: "0.1.0", platform: "darwin", installType: "full",
    fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true }; },
  });
  assert.equal(result.status, "recorded");
  assert.equal(captured.url, "https://example.test/api/install");
  assert.deepEqual(JSON.parse(captured.options.body), {
    installId: "4f92ab79-7bda-4fb4-a66f-86f1afed2d9d",
    version: "0.1.0", platform: "darwin", installType: "full",
  });
});
