import assert from "node:assert/strict";
import test from "node:test";

import { calculateBudgetStatus, calculateCosts } from "../src/costs.js";

test("calculates metered API cost from a confirmed effective price", () => {
  const result = calculateCosts({
    usageRecords: [{
      provider: "codex",
      model: "model-a",
      timestamp: "2026-02-10T10:00:00Z",
      inputTokens: 1_000_000,
      cachedInputTokens: 200_000,
      outputTokens: 500_000,
      project: "launch",
      measurement: "actual",
    }],
    priceBook: [{
      provider: "codex",
      model: "model-a",
      effectiveFrom: "2026-01-01T00:00:00Z",
      inputPerMillion: 2,
      cachedInputPerMillion: 0.5,
      outputPerMillion: 8,
      currency: "USD",
      source: "user-confirmed",
    }],
    subscriptions: [],
  });

  assert.deepEqual(result.metered, {
    measurement: "actual",
    currency: "USD",
    total: 5.7,
    byProject: [{ project: "launch", total: 5.7 }],
  });
});

test("marks metered cost unavailable when model pricing is missing", () => {
  const result = calculateCosts({
    usageRecords: [{ provider: "gemini", totalTokens: 100, measurement: "actual" }],
    priceBook: [],
    subscriptions: [],
  });

  assert.deepEqual(result.metered, {
    measurement: "unavailable",
    currency: null,
    unavailableRecords: 1,
  });
});

test("keeps fixed subscriptions separate from metered API cost", () => {
  const result = calculateCosts({
    usageRecords: [],
    priceBook: [],
    subscriptions: [
      { provider: "claude", monthlyAmount: 20, currency: "USD", confirmed: true },
      { provider: "codex", monthlyAmount: 0, currency: "USD", confirmed: false },
    ],
  });

  assert.deepEqual(result.subscriptions, {
    measurement: "actual",
    currency: "USD",
    monthlyTotal: 20,
    items: [{ provider: "claude", monthlyAmount: 20 }],
  });
});

test("calculates monthly actual spend and labels forecast as estimated", () => {
  const result = calculateBudgetStatus({
    usageRecords: [{
      provider: "codex", model: "model-a", timestamp: "2026-02-05T10:00:00Z",
      inputTokens: 1_000_000, outputTokens: 0, project: "launch", measurement: "actual",
    }],
    priceBook: [{
      provider: "codex", model: "model-a", effectiveFrom: "2026-01-01T00:00:00Z",
      inputPerMillion: 10, cachedInputPerMillion: 0, outputPerMillion: 0,
      currency: "USD", source: "user-confirmed",
    }],
    budgets: [{ scope: "all", monthlyAmount: 100, currency: "USD", confirmed: true }],
    asOf: "2026-02-10T12:00:00Z",
  });

  assert.deepEqual(result, [{
    scope: "all",
    measurement: "actual",
    currency: "USD",
    budget: 100,
    actualSpend: 10,
    usedPercent: 10,
    forecast: 28,
    forecastMeasurement: "estimated",
    status: "on-track",
  }]);
});

test("calculates project budgets only from usage attributed to that project", () => {
  const usageRecords = [
    { provider: "codex", model: "model-a", timestamp: "2026-02-02T10:00:00Z", inputTokens: 500_000, outputTokens: 0, project: "launch", measurement: "actual" },
    { provider: "codex", model: "model-a", timestamp: "2026-02-02T11:00:00Z", inputTokens: 500_000, outputTokens: 0, project: "other", measurement: "actual" },
  ];
  const priceBook = [{
    provider: "codex", model: "model-a", effectiveFrom: "2026-01-01T00:00:00Z",
    inputPerMillion: 10, cachedInputPerMillion: 0, outputPerMillion: 0,
    currency: "USD", source: "user-confirmed",
  }];

  const result = calculateBudgetStatus({
    usageRecords,
    priceBook,
    budgets: [{ scope: "project", project: "launch", monthlyAmount: 4, currency: "USD", confirmed: true }],
    asOf: "2026-02-10T12:00:00Z",
  });

  assert.equal(result[0].actualSpend, 5);
  assert.equal(result[0].status, "over-budget");
});

test("keeps budget status unavailable without a confirmed budget or complete pricing", () => {
  assert.deepEqual(calculateBudgetStatus({
    usageRecords: [{ provider: "codex", model: "unknown", timestamp: "2026-02-01T00:00:00Z", inputTokens: 10, outputTokens: 1, measurement: "actual" }],
    priceBook: [],
    budgets: [{ scope: "all", monthlyAmount: 100, currency: "USD", confirmed: false }],
    asOf: "2026-02-10T12:00:00Z",
  }), [{ scope: "all", measurement: "unavailable" }]);
});
