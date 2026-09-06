import assert from "node:assert/strict";
import test from "node:test";

import { buildVerificationReport } from "../src/verification-report.js";

test("reports evidence-backed memory and sync checks without changing state", () => {
  const state = {
    projects: [{ id: "site" }],
    contextPacks: [{ project: { id: "site" }, generatedAt: "2026-09-06T10:00:00.000Z" }],
    memoryHealth: { status: "healthy", missingContextPacks: [], needsReview: [] },
    lastSync: { status: "completed", at: "2026-09-06T10:05:00.000Z", rejected: 0 },
  };

  assert.deepEqual(buildVerificationReport(state), {
    status: "healthy",
    checks: {
      projects: 1,
      contextPacks: 1,
      memory: "healthy",
      sync: "completed",
      lastSyncAt: "2026-09-06T10:05:00.000Z",
      rejected: 0,
    },
    issues: [],
  });
  assert.equal(state.lastSync.status, "completed");
});

test("marks absent or unverified evidence for review instead of reporting success", () => {
  const report = buildVerificationReport({
    projects: [{ id: "site" }], contextPacks: [],
    memoryHealth: { status: "needs-review", missingContextPacks: ["site"], needsReview: ["decision-1"] },
  });

  assert.equal(report.status, "needs-review");
  assert.deepEqual(report.issues, ["missing-context-pack:site", "unverified-record:decision-1", "sync-not-run"]);
});
