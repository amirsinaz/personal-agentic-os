import assert from "node:assert/strict";
import test from "node:test";

import { generateRecommendations } from "../src/recommendations.js";

test("recommends fixing attribution when actual usage is unassigned", () => {
  const result = generateRecommendations({
    usageRecords: [
      { provider: "codex", measurement: "actual", project: "Unassigned", inputTokens: 800, cachedInputTokens: 0, outputTokens: 200 },
      { provider: "claude", measurement: "actual", project: "launch", inputTokens: 400, cachedInputTokens: 0, outputTokens: 100 },
    ],
    costs: { metered: { measurement: "unavailable" } },
  });

  assert.deepEqual(result[0], {
    id: "complete-project-attribution",
    kind: "configuration",
    measurement: "actual",
    evidence: { unassignedTokens: 1000, totalTokens: 1500 },
    expectedSaving: { measurement: "unavailable" },
    action: "review",
  });
});

test("recommends completing pricing without inventing cost or savings", () => {
  const result = generateRecommendations({
    usageRecords: [
      { provider: "gemini", measurement: "actual", project: "research", inputTokens: 300, cachedInputTokens: 0, outputTokens: 50 },
    ],
    costs: { metered: { measurement: "unavailable" } },
  });

  assert.deepEqual(result, [{
    id: "complete-price-book",
    kind: "configuration",
    measurement: "actual",
    evidence: { meteredCost: "unavailable", actualUsageRecords: 1 },
    expectedSaving: { measurement: "unavailable" },
    action: "review",
  }]);
});

test("does not recommend optimizations when usage itself is unavailable", () => {
  const result = generateRecommendations({
    usageRecords: [{ provider: "codex", measurement: "unavailable" }],
    costs: { metered: { measurement: "unavailable" } },
  });

  assert.deepEqual(result, []);
});
