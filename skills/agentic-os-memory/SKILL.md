---
name: agentic-os-memory
description: Maintain concise, evidence-linked operational memory in a configured Personal Agentic OS. Apply when a project session produces decisions, verified state, open questions, or next actions worth preserving.
---

# Agentic OS Memory

Write only to the Vault selected in the local Agentic OS configuration. If no configured Vault is available, return a proposed memory update without writing it.

## Capture contract

Preserve only durable information needed to resume or audit work:

- verified facts with their source;
- decisions explicitly accepted by the user;
- assumptions clearly marked as assumptions;
- unresolved questions;
- concrete next actions.

Do not copy full transcripts, hidden reasoning, raw command output, credentials, environment values, or unrelated personal information.

## Placement

Prefer the active project's existing generated or append-only memory files. Do not overwrite user-authored prose. Keep project records inside that project's directory and global records only for genuinely cross-project information.

## Verification

After writing, run the available local sync and verify the updated item appears in the active project's context pack. If evidence, project identity, or destination is ambiguous, leave the item pending instead of guessing.
