import test from "node:test";
import assert from "node:assert/strict";
import { buildReviewId, buildReviewSummary, parsePorcelain } from "../scripts/public-review-lib.js";

test("parses changed files without reading their content",()=>{
  assert.deepEqual(parsePorcelain(" M src/app/agents/page.tsx\0?? docs/spec.md\0"),[{status:" M",file:"src/app/agents/page.tsx"},{status:"??",file:"docs/spec.md"}]);
});

test("classifies public capabilities and excludes private data paths",()=>{
  const result=buildReviewSummary([{status:" M",file:"src/app/agents/page.tsx"},{status:"??",file:"01-Projects/Client/notes.md"},{status:"??",file:"src/features/token-economy/analytics.ts"}]);
  assert.deepEqual(result.capabilities,["Personal Agent Registry","Cost intelligence"]);
  assert.equal(result.excluded,1);
  assert.equal(result.files.length,2);
});

test("changes the review id when content changes inside the same file paths",()=>{
  const first=buildReviewId([{label:"dashboard",files:[{status:" M",file:"src/app/page.tsx",digest:"before"}]}]);
  const second=buildReviewId([{label:"dashboard",files:[{status:" M",file:"src/app/page.tsx",digest:"after"}]}]);
  assert.notEqual(first,second);
});
