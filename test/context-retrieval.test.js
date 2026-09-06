import assert from "node:assert/strict";
import test from "node:test";

import { searchProjectContext } from "../src/context-retrieval.js";

test("returns only local context documents that match the query and exposes their source path", () => {
  const results = searchProjectContext("تصمیم احراز هویت", [
    { path: "project-a/context.md", content: "Decision: use passkeys for authentication" },
    { path: "project-b/context.md", content: "Next step: redesign the dashboard" },
  ]);

  assert.deepEqual(results, [
    { path: "project-a/context.md", score: 1, matchedTerms: ["decisions", "authentication"] },
  ]);
});

test("returns no result instead of inventing context when nothing matches", () => {
  assert.deepEqual(searchProjectContext("بودجه", [{ path: "project-a/context.md", content: "Open question: authentication" }]), []);
});
