# Personal Agentic OS

A local-first system for managing multiple projects and maintaining shared working memory across Codex, Claude Code, and Gemini CLI—with Obsidian as the memory layer.

The repository contains none of the creator's projects, file paths, prompts, costs, or sample usage data. After installation, the dashboard updates only from sources the user explicitly selects.

## What it includes

- An empty Obsidian Starter Vault
- Local adapters for `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`
- Token usage sync from verifiable local sources
- Evidence-based usage attribution to confirmed projects or `Unassigned`
- Cost calculations based only on a user-confirmed price book
- Overall and per-project budgets with `actual`, `estimated`, and `unavailable` labels
- Advisory optimization recommendations
- A reversible Preview → Apply → Rollback workflow for Lean Context rules

## Recommended installation

1. Open [`prompts/master-install-en.md`](prompts/master-install-en.md).
2. Paste the prompt into Codex, Claude Code, or Gemini CLI.
3. The agent inspects the environment first and asks before installations or system changes.

The [Persian master prompt](prompts/master-install.md) is also available.

For direct setup after obtaining the repository:

```bash
npm install
npm run setup
npm run dashboard -- /absolute/path/to/config.json
```

## If Obsidian is not installed

The setup directs the user only to the official [Obsidian download page](https://obsidian.md/download). The user can install Obsidian or continue in Dashboard-only mode; Dashboard-only mode does not provide the complete shared-memory layer.

## Privacy and install counting

Telemetry is disabled by default. If the user explicitly opts in, the successful-install event is limited to:

- Random installation ID
- Application version
- Operating system
- Install type: Full or Dashboard-only
- Server-recorded timestamp

Project names, file paths, Vault content, prompts, conversation text, token records, cost records, and credentials are never part of this payload.

## Preview, apply, and rollback

```bash
npm run optimize -- preview /absolute/project/path codex,claude,gemini
npm run optimize -- apply /absolute/project/path codex,claude,gemini
npm run optimize -- rollback /absolute/project/path/.agentic-os/changes/AUDIT_ID.json
```

Preview makes no changes. Apply requires explicit confirmation and creates a local audit. Rollback restores the exact previous content and refuses to overwrite newer user edits.

## Measurement labels

- `actual`: Calculated directly from verifiable data.
- `estimated`: A forecast, never presented as actual spend or usage.
- `unavailable`: Required data or pricing is missing; no substitute value is invented.

## Development

```bash
npm test
```

## Resource page

See the bilingual guide, real sanitized screenshots, and copyable prompts at [myagenticstack.com](https://myagenticstack.com).

## License

MIT © AmirSina Zamanian
