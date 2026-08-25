# Skills and adapters

The public package uses a small, auditable skill bundle. Skills are copied from this repository only after the user approves installation.

## Core skills

1. `agenting-os-core`
   - Reads the active project's context pack before work.
   - Writes accepted decisions, open questions, and next actions back to the user's Vault.
   - Never copies raw chat transcripts by default.

2. `agenting-os-memory`
   - Converts a completed AI session into a concise, source-linked session summary.
   - Separates observed facts, user decisions, assumptions, and unresolved questions.

3. `agenting-os-token-economy`
   - Prefers the lowest-cost reliable route.
   - Labels usage and cost as actual, estimated, or unavailable.
   - Does not invent savings or infer prices from token counts.

## Tool adapters

- Codex: native `SKILL.md` packages plus `AGENTS.md` project guidance.
- Claude Code: equivalent project instructions in `CLAUDE.md`.
- Cursor: scoped rules under `.cursor/rules/`.
- ChatGPT and other chat tools: export a portable Context Pack for manual attachment or supported connectors.

Adapters share the same memory contract but are installed only for tools the user selects.

## Reversible optimization

The Lean Context policy changes only the selected agent guidance files. Its expected saving stays `unavailable` until a controlled comparison measures it.

```bash
npm run optimize -- preview /absolute/project/path codex,claude,gemini
npm run optimize -- apply /absolute/project/path codex,claude,gemini
npm run optimize -- rollback /absolute/project/path/.agenting-os/changes/AUDIT_ID.json
```

`preview` makes no changes. `apply` asks for explicit confirmation and writes a local audit. `rollback` refuses to overwrite newer user edits made after the policy was applied.

## Installation policy

- Show the exact skills and target directories before copying anything.
- Ask before installing dependencies, skills, scheduled jobs, or external services.
- Keep telemetry disabled unless the user explicitly opts in.
- Never transmit Vault contents, project names, prompts, paths, usage records, or cost records.
- Do not read `.env`, credential stores, browser profiles, or unrelated directories.
