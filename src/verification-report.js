export function buildVerificationReport(state = {}) {
  const projects = state.projects ?? [];
  const contextPacks = state.contextPacks ?? [];
  const memory = state.memoryHealth ?? {};
  const issues = [
    ...(memory.missingContextPacks ?? []).map((id) => `missing-context-pack:${id}`),
    ...(memory.needsReview ?? []).map((id) => `unverified-record:${id}`),
  ];
  if (!state.lastSync) issues.push("sync-not-run");
  else if (state.lastSync.status !== "completed") issues.push(`sync-status:${state.lastSync.status ?? "unknown"}`);
  if (Number(state.lastSync?.rejected ?? 0) > 0) issues.push(`sync-rejected:${state.lastSync.rejected}`);

  return {
    status: issues.length || memory.status === "needs-review" ? "needs-review" : "healthy",
    checks: {
      projects: projects.length,
      contextPacks: contextPacks.length,
      memory: memory.status ?? "unavailable",
      sync: state.lastSync?.status ?? "not-run",
      lastSyncAt: state.lastSync?.at ?? null,
      rejected: Number(state.lastSync?.rejected ?? 0),
    },
    issues,
  };
}

