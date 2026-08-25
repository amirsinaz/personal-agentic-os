function totalTokens(record) {
  return (record.inputTokens ?? 0) + (record.outputTokens ?? 0);
}

export function generateRecommendations({ usageRecords = [], costs }) {
  const actual = usageRecords.filter((record) => record.measurement === "actual");
  if (!actual.length) return [];

  const recommendations = [];
  const unassignedTokens = actual
    .filter((record) => record.project === "Unassigned")
    .reduce((sum, record) => sum + totalTokens(record), 0);
  if (unassignedTokens > 0) {
    recommendations.push({
      id: "complete-project-attribution",
      kind: "configuration",
      measurement: "actual",
      evidence: {
        unassignedTokens,
        totalTokens: actual.reduce((sum, record) => sum + totalTokens(record), 0),
      },
      expectedSaving: { measurement: "unavailable" },
      action: "review",
    });
  }
  if (costs?.metered?.measurement !== "actual") {
    recommendations.push({
      id: "complete-price-book",
      kind: "configuration",
      measurement: "actual",
      evidence: { meteredCost: "unavailable", actualUsageRecords: actual.length },
      expectedSaving: { measurement: "unavailable" },
      action: "review",
    });
  }
  return recommendations;
}
