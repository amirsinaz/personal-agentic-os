# Personal Agentic OS

A local-first system for managing multiple projects and maintaining shared working memory across Codex, Claude Code, and Gemini CLI—with Obsidian as the memory layer.

The repository contains none of the creator's projects, file paths, prompts, costs, or sample usage data. After installation, the dashboard updates only from sources the user explicitly selects.

Read the [security policy and local-first trust boundaries](SECURITY.md) before installation.

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

## Keep the public project in sync

The repository includes a one-way, allowlist-based sync. It never copies a complete Vault. Only paths explicitly listed in the local configuration can enter the public repository, and every copied text file passes a privacy scan first.

1. Copy `.sync-public.local.example.json` to `.sync-public.local.json`.
2. Set `sourceRoot` to the absolute path of your private Agentic OS source.
3. Keep `privateMappings` limited to generic templates, public skills, and other reviewed artifacts.
4. Run `npm run sync-public` to prepare changes.
5. Run `npm run sync-public:publish` to run all repository and website checks before reviewing, committing, and pushing the changes.

Use `npm run sync-public:check` in CI or a scheduled local job to detect drift without writing files. The local configuration is ignored by Git and must never contain secrets.

On macOS, run `npm run sync-public:install-watcher` once to create a private LaunchAgent from the path-free public template. Changes in the private dashboard or approved templates create a local `.public-review/pending.json` proposal. Publishing stays blocked until the exact review ID is approved with `npm run review-public:approve -- <review-id>`. Approval records intent; adapting, testing, and publishing the generalized public version remain separate steps. Local paths and project data are never committed.

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
