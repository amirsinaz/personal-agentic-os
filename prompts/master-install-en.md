# Master Install Prompt

Paste this prompt into Codex, Claude Code, or Gemini CLI.

[Visual guide and latest version](https://personal-agenting-os.sina-zy.chatgpt.site) · [Repository and documentation](https://github.com/amirsinaz/personal-agenting-os)

```text
## Goal

Install Personal Agentic OS locally from `https://github.com/amirsinaz/personal-agenting-os`. It must use only my own data to maintain shared project memory, project status, and LLM usage visibility.

## Boundaries

- Begin with a read-only inspection. Report the current agent, operating system, and whether Git, Node.js, and Obsidian are available.
- Never transmit project names, Vault content, prompts, conversations, file paths, tokens, costs, credentials, or secrets.
- Do not read `.env` files, credential stores, keychains, browser profiles, or directories I have not approved.
- Telemetry is off by default. Enable it only after my explicit consent. The only permitted fields are a random install ID, app version, operating system, and install type.
- Stop and ask before cloning, downloading, installing a dependency or skill, running an installer, creating a persistent service, writing outside the current directory, overwriting a file, or deleting anything.

## Execution

1. Detect whether you are Codex, Claude Code, or Gemini CLI. If detection is uncertain, ask only this question.
2. If Obsidian is missing, briefly explain that it is the local memory layer and reference only `https://obsidian.md/download`. Ask before installation. Also explain Dashboard-only mode and its memory limitation.
3. After approval, obtain the repository and inspect its README, skills guide, and privacy documentation. Stop if a required file is unavailable.
4. Ask me one item at a time: existing or new Vault, Vault path, LLM tools, each tool's local data path, confirmed project roots, Starter or Full install, monthly subscriptions, confirmed model price book, overall or project budgets, and telemetry consent.
5. Before changing anything, show a short preview listing files to create, skills, dependencies, and destination paths. Wait for approval.
6. Run the repository's official setup wizard. Install only the selected adapters: `AGENTS.md` for Codex, `CLAUDE.md` for Claude Code, and `GEMINI.md` for Gemini CLI.
7. For a new Vault, create only the generic structure and empty templates. For an existing Vault, show a backup plan and do not overwrite files without approval.
8. Run the first sync. The dashboard must contain only my system's data. Show `Empty` or `Unavailable` when evidence is missing; never create demo values.
9. With my permission, create one local test project, change its status, and sync again to prove the dashboard updates.
10. If a Lean Context recommendation is available, show Preview first. Apply and Rollback each require separate confirmation. Never claim savings without a controlled comparison.

## Done

Declare completion only when the dashboard runs, a local change appears after sync, all repository tests pass, and no personal data appears in logs or network requests. Report the install and Vault paths, active adapters, telemetry status, sync result, dashboard start and stop commands, changed files, and anything still unverified. Stop after two repeated failures on the same error and ask for guidance.
```

🎯 Target: Codex, Claude Code, and Gemini CLI — optimized for a local-first, permission-gated, reversible installation.

This prompt is for an agentic tool with real system access. Review paths, permissions, and approval boundaries before pasting it.
