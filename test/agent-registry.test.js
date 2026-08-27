import assert from "node:assert/strict";
import test from "node:test";

import { buildAgentProfiles } from "../src/agent-registry.js";

test("collapses explicit observations into one profile per agent and project",()=>{
  const profiles=buildAgentProfiles([
    {agentId:"codex",agentType:"primary-agent",project:"launch",observedAt:"2026-08-20T10:00:00Z",sourceSession:"s1",sourcePath:"logs/one",evidence:{name:"Codex",responsibility:"unknown",tool:"unknown",skills:[]}},
    {agentId:"codex",agentType:"primary-agent",project:"launch",observedAt:"2026-08-24T10:00:00Z",sourceSession:"s2",sourcePath:"logs/two",evidence:{name:"Codex",responsibility:"MVP implementation",tool:"Codex desktop",skills:["test-driven-development"]}},
  ]);
  assert.deepEqual(profiles,[{agentId:"codex",name:"Codex",agentType:"primary-agent",project:"launch",responsibility:"MVP implementation",tools:["Codex desktop"],skills:["test-driven-development"],observationCount:2,firstSeen:"2026-08-20T10:00:00Z",lastActivity:"2026-08-24T10:00:00Z",latestSourceSession:"s2",latestSourcePath:"logs/two",status:"observed"}]);
});

test("keeps unknown evidence honest and separates the same agent by project",()=>{
  const profiles=buildAgentProfiles([
    {agentId:"subagent:researcher",agentType:"subagent",project:"alpha",observedAt:"2026-08-20T10:00:00Z",sourceSession:"s1",sourcePath:"logs/one",evidence:{}},
    {agentId:"subagent:researcher",agentType:"subagent",project:"beta",observedAt:"2026-08-21T10:00:00Z",sourceSession:"s2",sourcePath:"logs/two",evidence:{}},
  ]);
  assert.equal(profiles.length,2);
  assert.deepEqual(profiles.map((profile)=>profile.project),["alpha","beta"]);
  assert.ok(profiles.every((profile)=>profile.responsibility==="unknown"));
});

test("rejects observations without explicit project provenance",()=>{
  assert.throws(()=>buildAgentProfiles([{agentId:"codex",agentType:"primary-agent",observedAt:"2026-08-20T10:00:00Z",sourceSession:"s1",sourcePath:"logs/one",evidence:{}}]),/project/i);
});
