import assert from "node:assert/strict";
import test from "node:test";

import { buildProjectContextEnvelope, createConnectionRecord, validateConnectorManifest } from "../src/connector-contract.js";

const manifest={schemaVersion:1,connectorKey:"local-tool",displayName:"Local Tool",transport:{kind:"file",directory:"/tmp/context"},capabilities:["project-catalog","context-bootstrap","context-incremental"]};

test("accepts a vendor-neutral least-privilege connector manifest",()=>{
  assert.deepEqual(validateConnectorManifest(manifest),manifest);
  const connection=createConnectionRecord(manifest,{now:"2026-08-29T13:00:00.000Z"});
  assert.equal(connection.isEnabled,false);
  assert.deepEqual(connection.scopes,["context:read"]);
  assert.equal(connection.health,"unknown");
});

test("rejects unsafe or unsupported connector manifests",()=>{
  assert.throws(()=>validateConnectorManifest({...manifest,connectorKey:"Bad Key"}),/connector key/i);
  assert.throws(()=>validateConnectorManifest({...manifest,transport:{kind:"http",endpoint:"http://example.com"}}),/https/i);
  assert.throws(()=>validateConnectorManifest({...manifest,capabilities:["context-bootstrap","context-bootstrap"]}),/duplicate/i);
  assert.throws(()=>validateConnectorManifest({...manifest,schemaVersion:2}),/schema version/i);
});

test("builds deterministic redacted project envelopes",()=>{
  const input={project:{id:"site",name:"Site",classification:"named"},context:{overview:"Current state",facts:["token=private-value"],decisions:["Keep local"],assumptions:[],goals:[],rules:[],agents:[],skills:[],tools:[],routines:[],recentObservations:[]},provenance:[{sourceType:"session",sourceId:"s1"}],generatedAt:"2026-08-29T13:00:00.000Z"};
  const first=buildProjectContextEnvelope(input);
  const second=buildProjectContextEnvelope(input);
  assert.equal(first.revision,second.revision);
  assert.doesNotMatch(JSON.stringify(first),/private-value/);
  assert.match(JSON.stringify(first),/REDACTED/);
  assert.notEqual(buildProjectContextEnvelope({...input,context:{...input.context,overview:"Changed"}}).revision,first.revision);
});
