import assert from "node:assert/strict";
import test from "node:test";

import { buildConnectionRegistry, identifyCanonicalProjects } from "../src/connections.js";

test("registers only user-selected tools with independent local sources",()=>{
  assert.deepEqual(buildConnectionRegistry({tools:["codex","gemini"],sources:{codex:"/local/codex",gemini:"/local/gemini",claude:"/local/claude"}}),[
    {id:"codex",source:"/local/codex",status:"configured",sync:"manual"},
    {id:"gemini",source:"/local/gemini",status:"configured",sync:"manual"},
  ]);
});

test("registers a compatible future tool from a validated manifest",()=>{
  const registry=buildConnectionRegistry({tools:["local-tool"],sources:{"local-tool":"/tmp/context"},manifests:[{schemaVersion:1,connectorKey:"local-tool",displayName:"Local Tool",transport:{kind:"file",directory:"/tmp/context"},capabilities:["context-bootstrap"]}]});
  assert.equal(registry[0].id,"local-tool");
  assert.equal(registry[0].status,"configured");
  assert.equal(registry[0].connectorKind,"file");
});

test("groups the same project across tools by repository identity",()=>{
  const projects=identifyCanonicalProjects([
    {tool:"codex",path:"/work/product",name:"Product",repository:"git@example.com:team/product.git",markers:["roadmap","api"]},
    {tool:"claude",path:"/archive/product-copy",name:"Product copy",repository:"https://example.com/team/product.git",markers:["roadmap","api"]},
    {tool:"gemini",path:"/work/other",name:"Other",repository:"https://example.com/team/other.git",markers:["roadmap"]},
  ]);
  assert.equal(projects.length,2);
  assert.deepEqual(projects[0].tools,["claude","codex"]);
  assert.equal(projects[0].shared,true);
  assert.equal(projects[1].shared,false);
});

test("requires strong content evidence and never merges by name alone",()=>{
  const projects=identifyCanonicalProjects([
    {tool:"codex",path:"/one/a",name:"Website",markers:["launch","pricing","design"]},
    {tool:"gemini",path:"/two/b",name:"Website",markers:["launch","pricing","design"]},
    {tool:"claude",path:"/three/c",name:"Website",markers:["unrelated"]},
  ]);
  assert.equal(projects.length,2);
  assert.equal(projects.find((project)=>project.tools.length===2)?.matchReason,"content-markers");
});
