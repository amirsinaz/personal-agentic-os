---
name: agenting-os-token-economy
description: Reduce avoidable LLM context and tool usage while keeping required quality and evidence. Apply to Agenting OS work that selects context, compares usage, or records token and cost observations.
---

# Agenting OS Token Economy

Prefer the smallest relevant context pack and deterministic local checks before loading more files or invoking another model. Do not reduce context when doing so would weaken safety, correctness, or the user's acceptance criteria.

## Measurement contract

- Label usage and cost as `actual`, `estimated`, or `unavailable`.
- Never invent token counts, provider prices, costs, or savings.
- Do not call a before-and-after difference a saving unless a controlled comparison supports that claim.
- Keep fixed subscription allocation separate from metered API cost.

## Privacy

Usage records remain local. Telemetry consent does not authorize sending prompts, project names, model transcripts, paths, token records, or cost records.

## Recommendations

Recommendations are advisory until the user approves applying them. Show the affected local files and keep a reversible record when a recommendation changes context or routing policy.
