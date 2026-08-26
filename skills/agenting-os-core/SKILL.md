---
name: agenting-os-core
description: Use a locally configured Personal Agentic OS as project memory. Apply when starting, continuing, or closing work that should read or update a project's portable context pack.
---

# Agenting OS Core

Use only the Vault and source paths selected in the local Agenting OS configuration. Never assume a username, home directory, project name, or provider-specific data path.

## Start work

1. Resolve the active project from the current working directory and the local project registry.
2. Read that project's `Exports/context-pack.json` when available.
3. Follow source links only when the task needs more detail. Do not load the whole Vault by default.
4. If no project or context pack matches, state that memory is unavailable and continue without inventing context.

## Update memory

Record only information supported by the current work:

- user-confirmed decisions;
- verified current state;
- unresolved questions;
- next actions;
- concise source references needed to resume work.

Do not store hidden reasoning, credentials, environment values, raw tool output, or full chat transcripts. Keep facts, assumptions, and suggestions distinguishable. Do not overwrite user-authored notes when a generated projection or append-only record is available.

## Privacy boundary

All project memory remains local unless the user explicitly authorizes a specific external destination. Telemetry consent never authorizes sending project content, project names, prompts, paths, token records, or cost records.

## Finish work

Run the repository's local sync command when available, verify that the active project's context pack changed as intended, and report any memory item that could not be confirmed. Do not claim a successful sync without observable output.
