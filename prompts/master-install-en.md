# Master Install Prompt

Paste this prompt into Codex, Claude Code, or Gemini CLI.

[Visual guide and latest version](https://myagenticstack.com) · [Repository and documentation](https://github.com/amirsinaz/personal-agentic-os)

```text
## Goal

Install Personal Agentic OS locally from `https://github.com/amirsinaz/personal-agentic-os`. It must use only my own data to maintain shared project memory, project status, and LLM usage visibility.

## Boundaries

- Begin with a read-only inspection. Report the current agent, operating system, and whether Git, Node.js, and Obsidian are available.
- Never transmit project names, Vault content, prompts, conversations, file paths, tokens, costs, credentials, or secrets.
- Do not read `.env` files, credential stores, keychains, browser profiles, or directories I have not approved.
- Telemetry is off by default. Enable it only after my explicit consent. The only permitted fields are a random install ID, app version, operating system, and install type.
- Stop and ask before cloning, downloading, installing a dependency or skill, running an installer, creating a persistent service, writing outside the current directory, overwriting a file, or deleting anything.

## Execution

1. Detect the current tool, then ask which AI tools I use now and which ones I may add later. Register only tools I explicitly confirm. If a tool has no built-in adapter, suggest it only when it provides a valid connector manifest and supported transport; connector registration is not permission to install or enable it.
2. If Obsidian is missing, briefly explain that it is the local memory layer and reference only `https://obsidian.md/download`. Ask before installation. Also explain Dashboard-only mode and its memory limitation.
3. After approval, obtain the repository and inspect its README, skills guide, and privacy documentation. Stop if a required file is unavailable.
4. Ask one item at a time: existing or new Vault, Vault path, each selected tool's local data source, approved project directories, Starter or Full install, optional financial inputs, telemetry consent, recurring sync, and weekly update checks.
5. Inside approved directories only, discover project candidates. Record the source tool, local path, Git identity when available, and non-sensitive content markers such as key filenames and approved titles. Do not transfer raw conversations.
6. Group copies of the same project by exact path or repository identity. Without either signal, content matching requires at least two shared content markers and strong overlap. Name similarity alone must never merge projects.
7. Before writing anything, show the canonical project map: canonical projects, connected tools, shared copies, uncertain matches, and destination files. Ask me to correct or approve it.
8. After approval, run the official Setup Wizard and install only selected adapters. Every connection must remain independently configurable and syncable.
9. For a new Vault, create the generic structure. For an existing Vault, show a backup plan. Then transfer only verified current state, accepted decisions, open questions, and next actions for approved projects. Every record must preserve its source, timestamp, confidence, and verification status. Never store transcripts, hidden reasoning, or secrets, and never promote an assumption to a verified fact.
10. Run the first sync and report each project as created, updated, unchanged, uncertain, or rejected. Do not write uncertain matches without approval. Generate a redacted Markdown and JSON context pack for each approved project so a new tool receives only its permitted memory.
11. Rebuild the dashboard from fresh state. Project count, connected tools, context packs, memory health, last-sync status, and usage data must come only from my data; missing evidence stays `Unavailable` and unverified records enter review.
12. Only with explicit approval, enable recurring sync for the operating system. Sync must be incremental, propagate approved project changes to shared memory, and refresh the dashboard. It must not install software updates or change memory without a preview.
13. Test the “add a new tool” path: confirm its access, compare its projects with the canonical map, provide only approved project context, and keep existing tools current with later changes to the same project.
14. If Lean Context recommendations exist, show Preview first. Apply and Rollback require separate confirmation. Check releases when the dashboard starts and on the weekly schedule. Normal releases are announcements; when the manifest says the installed version is below the supported minimum, pause sync and show the repaired release, but never overwrite application files or the Vault automatically.

## Done

Declare completion only when the dashboard runs, a local change appears after sync, all repository tests pass, and no personal data appears in logs or network requests. Report the install and Vault paths, active adapters, telemetry status, sync result, dashboard start and stop commands, changed files, and anything still unverified. Stop after two repeated failures on the same error and ask for guidance.
```

🎯 Target: Codex, Claude Code, and Gemini CLI — optimized for a local-first, permission-gated, reversible installation.

This prompt is for an agentic tool with real system access. Review paths, permissions, and approval boundaries before pasting it.
