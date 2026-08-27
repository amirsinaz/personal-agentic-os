import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewSummary, parsePorcelain } from "../scripts/public-review-lib.js";

test("parses changed files without reading their content",()=>{
  assert.deepEqual(parsePorcelain(" M src/app/agents/page.tsx\0?? docs/spec.md\0"),[{status:" M",file:"src/app/agents/page.tsx"},{status:"??",file:"docs/spec.md"}]);
});

test("classifies public capabilities and excludes private data paths",()=>{
  const result=buildReviewSummary([{status:" M",file:"src/app/agents/page.tsx"},{status:"??",file:"01-Projects/Client/notes.md"},{status:"??",file:"src/features/token-economy/analytics.ts"}]);
  assert.deepEqual(result.capabilities,["Personal Agent Registry","Cost intelligence"]);
  assert.equal(result.excluded,1);
  assert.equal(result.files.length,2);
});
