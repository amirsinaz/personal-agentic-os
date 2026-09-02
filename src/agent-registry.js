function known(value) {
  return typeof value === "string" && value.trim() && value.trim() !== "unknown" ? value.trim() : null;
}

function requireObservation(item) {
  for (const field of ["agentId", "agentType", "project", "observedAt", "sourceSession", "sourcePath"]) {
    if (!known(item?.[field])) throw new Error(`Agent observation requires explicit ${field}`);
  }
  if (!["primary-agent", "subagent"].includes(item.agentType)) throw new Error("Unsupported agentType");
}

export function buildAgentProfiles(observations = []) {
  const grouped = new Map();
  for (const item of observations) {
    requireObservation(item);
    const key = `${item.project}\0${item.agentId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped.values()].map((items) => {
    items.sort((left, right) => left.observedAt.localeCompare(right.observedAt));
    const latest = items.at(-1);
    const evidence = items.toReversed().map((item) => item.evidence && typeof item.evidence === "object" ? item.evidence : {});
    const tools = [...new Set(evidence.map((item) => known(item.tool)).filter(Boolean))].sort();
    const skills = [...new Set(evidence.flatMap((item) => Array.isArray(item.skills) ? item.skills.map(known).filter(Boolean) : []))].sort();
    return {
      agentId: latest.agentId,
      name: known(latest.evidence?.name) ?? latest.agentId.replace(/^subagent:/, ""),
      agentType: latest.agentType,
      project: latest.project,
      responsibility: evidence.map((item) => known(item.responsibility)).find(Boolean) ?? "unknown",
      tools,
      skills,
      observationCount: items.length,
      firstSeen: items[0].observedAt,
      lastActivity: latest.observedAt,
      latestSourceSession: latest.sourceSession,
      latestSourcePath: latest.sourcePath,
      status: "observed",
    };
  }).sort((left, right) => left.project.localeCompare(right.project) || left.agentId.localeCompare(right.agentId));
}

export function queryAgentProfiles(profiles=[],{project,agentType,page=1,pageSize=5}={}){
  if(!Number.isInteger(page)||page<1||!Number.isInteger(pageSize)||pageSize<1)throw new Error("Invalid pagination");
  const filtered=profiles.filter((profile)=>(!project||profile.project===project)&&(!agentType||profile.agentType===agentType));
  const totalItems=filtered.length;
  const totalPages=Math.max(1,Math.ceil(totalItems/pageSize));
  const start=(page-1)*pageSize;
  return {items:filtered.slice(start,start+pageSize),page,pageSize,totalItems,totalPages};
}
