import assert from "node:assert/strict";
import test from "node:test";

import { applyClarificationAnswer, buildClarificationQueue, buildMemorySnapshot } from "../src/memory-intelligence.js";

test("creates stable questions for missing project and agent context",()=>{
  const queue=buildClarificationQueue({
    projects:[{id:"site",name:"Site",status:"active"}],
    records:[],
    agents:[{agentId:"codex",agentType:"primary-agent",project:"site",responsibility:"unknown",tools:[],skills:[]}],
    detectedAt:"2026-09-08T10:00:00.000Z",
  });
  assert.ok(queue.some((item)=>item.id==="missing:project:site:goal"));
  assert.ok(queue.some((item)=>item.id==="missing:project:site:workflow"));
  assert.ok(queue.some((item)=>item.id==="missing:agent:site:codex:responsibility"));
  assert.ok(queue.every((item)=>item.status==="pending"&&item.provenance));
});

test("preserves answered questions and does not reopen them",()=>{
  const answered={id:"missing:project:site:goal",scopeType:"project",scopeId:"site",project:"site",field:"goal",status:"answered",answer:"Ship the MVP"};
  const queue=buildClarificationQueue({projects:[{id:"site",name:"Site",status:"active"}],records:[],existingQuestions:[answered]});
  assert.equal(queue.filter((item)=>item.id===answered.id).length,1);
  assert.equal(queue.find((item)=>item.id===answered.id).status,"answered");
});

test("asks about a material project change with old and new values",()=>{
  const previous=buildMemorySnapshot({projects:[{id:"site",name:"Site",status:"active"}],agents:[]});
  const queue=buildClarificationQueue({projects:[{id:"site",name:"Site",status:"paused"}],agents:[],records:[],previousSnapshot:previous,detectedAt:"2026-09-08T10:00:00.000Z"});
  const question=queue.find((item)=>item.reason==="changed"&&item.field==="status");
  assert.equal(question.previousValue,"active");
  assert.equal(question.observedValue,"paused");
});

test("asks when verified project records conflict",()=>{
  const queue=buildClarificationQueue({projects:[{id:"site",name:"Site",status:"active"}],agents:[],records:[
    {id:"g1",project:"site",type:"Goal",content:"Launch this week",verified:true,status:"active"},
    {id:"g2",project:"site",type:"Goal",content:"Pause the launch",verified:true,status:"active"},
  ]});
  const question=queue.find((item)=>item.reason==="conflict"&&item.field==="goal");
  assert.ok(question);
  assert.deepEqual(question.observedValues,["Launch this week","Pause the launch"]);
});

test("asks when an agent responsibility materially changes",()=>{
  const previous=buildMemorySnapshot({projects:[],agents:[{project:"site",agentId:"codex",responsibility:"Implement frontend",tools:["Codex"],skills:["React"]}]});
  const queue=buildClarificationQueue({projects:[],records:[],agents:[{project:"site",agentId:"codex",agentType:"primary-agent",responsibility:"Own backend",tools:["Codex"],skills:["React"]}],previousSnapshot:previous});
  const question=queue.find((item)=>item.reason==="changed"&&item.field==="responsibility");
  assert.equal(question.previousValue,"Implement frontend");
  assert.equal(question.observedValue,"Own backend");
});

test("turns an answer into a verified user-confirmed knowledge record",()=>{
  const question={id:"missing:project:site:goal",scopeType:"project",scopeId:"site",project:"site",field:"goal",prompt:"What is the goal?",status:"pending"};
  const result=applyClarificationAnswer({question,answer:"Ship the first reliable MVP",records:[],answeredAt:"2026-09-08T12:00:00.000Z"});
  assert.equal(result.question.status,"answered");
  assert.equal(result.record.type,"Goal");
  assert.equal(result.record.status,"user-confirmed");
  assert.equal(result.record.verified,true);
  assert.equal(result.record.source_session,"user-clarification");
});

test("requires a non-empty answer",()=>{
  assert.throws(()=>applyClarificationAnswer({question:{id:"q",project:"site",field:"goal"},answer:"  ",records:[]}),/Answer is required/);
});

test("rejects clarification answers longer than the dashboard limit",()=>{
  assert.throws(()=>applyClarificationAnswer({question:{id:"q",project:"site",field:"goal"},answer:"x".repeat(4001),records:[]}),/too long/i);
});

test("turns an extracted unverified candidate into a review question",()=>{
  const queue=buildClarificationQueue({projects:[{id:"site",name:"Site",status:"active"}],agents:[],records:[{id:"candidate-1",project:"site",type:"Decision",content:"Use SQLite",status:"observed",verified:false,source_session:"chat-1"}]});
  const question=queue.find((item)=>item.id==="review:record:candidate-1");
  assert.equal(question.knowledgeType,"Decision");
  assert.match(question.prompt,/Use SQLite/);
});

test("preserves the extracted knowledge type when the user corrects a candidate",()=>{
  const question={id:"review:record:candidate-1",scopeType:"record",scopeId:"candidate-1",project:"site",field:"candidate",knowledgeType:"Decision",status:"pending"};
  const result=applyClarificationAnswer({question,answer:"Use PostgreSQL",records:[]});
  assert.equal(result.record.type,"Decision");
});
