import assert from "node:assert/strict";
import test from "node:test";

import { auditOperationalMemory, buildPortableContextPack, createKnowledgeRecord, redactOperationalContent } from "../src/operational-memory.js";

test("removes private spans and credential-shaped values before memory is persisted",()=>{
  assert.equal(redactOperationalContent("Keep <private>internal project note</private> visible api_key=abc123"),"Keep [REDACTED] visible api_key=[REDACTED]");
  assert.equal(redactOperationalContent("Public <private>everything after this"),"Public [REDACTED]");
});

test("creates provenance-bearing records without upgrading assumptions to facts",()=>{
  const record=createKnowledgeRecord({id:"decision-1",type:"Decision",project:"site",content:"Use the approved layout",sourceSession:"session-1",sourcePath:"local/session-1",confidence:0.9,verified:true,updatedAt:"2026-08-29T12:00:00.000Z"});
  assert.equal(record.verified,true);
  assert.equal(record.source_session,"session-1");
  const assumption=createKnowledgeRecord({id:"assumption-1",type:"Assumption",project:"site",content:"Users may prefer this",verified:true,updatedAt:"2026-08-29T12:00:00.000Z"});
  assert.equal(assumption.verified,false);
});

test("builds a redacted portable context pack for one canonical project",()=>{
  const pack=buildPortableContextPack({project:{id:"site",name:"Site"},records:[
    {id:"d1",type:"Decision",project:"site",content:"Keep the compact cards",verified:true,source_session:"s1"},
    {id:"x",type:"Fact",project:"other",content:"Ignore",verified:true},
    {id:"secret",type:"Fact",project:"site",content:"api_key=secret-value",verified:true},
  ],generatedAt:"2026-08-29T12:00:00.000Z"});
  assert.equal(pack.schemaVersion,1);
  assert.equal(pack.project.id,"site");
  assert.equal(pack.records.length,2);
  assert.match(pack.markdown,/Keep the compact cards/);
  assert.doesNotMatch(pack.markdown,/secret-value/);
  assert.match(pack.markdown,/\[REDACTED\]/);
});

test("reports missing packs and unverified records without changing them",()=>{
  const report=auditOperationalMemory({projects:[{id:"site"},{id:"app"}],records:[{id:"q1",project:"site",verified:false}],packs:[{project:{id:"site"}}],checkedAt:"2026-08-29T12:00:00.000Z"});
  assert.deepEqual(report.missingContextPacks,["app"]);
  assert.deepEqual(report.needsReview,["q1"]);
  assert.equal(report.status,"needs-review");
});
