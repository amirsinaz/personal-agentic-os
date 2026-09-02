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
- An approval-gated canonical project map across selected AI tools
- Incremental memory sync with created, updated, unchanged, and removed project states
- Independent connection records and optional recurring sync templates for macOS, Linux, and Windows
- Provenance-bearing knowledge records that keep assumptions separate from verified facts
- Redacted Markdown and JSON context packs for moving approved project memory to another tool
- Memory-health checks for missing context packs and records that still need review
- A vendor-neutral connector manifest for compatible future tools, with disabled-by-default least privilege
- Private-span and credential-pattern filtering before operational memory is stored
- Project/type filters and stable pagination for evidence-backed Agent profiles
- Equal-period cost comparison that keeps causal savings explicitly unavailable
- Post-Apply optimization evidence that waits for enough valid runs
- Read-only Sync integrity reports for missing, changed, and removed project ledger entries

## Recommended installation

1. Run `npx personal-agentic-os@latest` in a terminal.
2. Review and approve the deterministic local setup plan.
3. Use [`prompts/master-install-en.md`](prompts/master-install-en.md) in Codex, Claude Code, or Gemini CLI for semantic project discovery, deduplication, and memory migration.

The [Persian master prompt](prompts/master-install.md) is also available.

NPM handles repeatable file and adapter setup. The agent prompt is intentionally retained for tasks that require understanding project content and user approval; it is not used as a substitute for deterministic installation.

## Personal Agent Registry

The local dashboard can build a stable, project-aware Agent Registry from explicit observations stored in `04-Agents/observations.json`. It keeps primary agents and subagents separate, preserves source provenance, and shows responsibilities, tools, and skills only when evidence provides them. Missing fields remain `unknown`; the registry does not read hidden reasoning or infer ownership.

Each observation must include `agentId`, `agentType`, `project`, `observedAt`, `sourceSession`, and `sourcePath`, plus an optional `evidence` object. A new starter Vault includes an empty observation file and never creates sample agents.

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
npm run sync -- /absolute/path/to/config.json
npm run dashboard -- /absolute/path/to/config.json
```

During setup, the wizard shows the proposed tool connections and canonical project map before it writes memory. Projects are merged only by exact path, repository identity, or strong content-marker evidence. Name similarity alone is never enough. With approval, an operating-system template from `ops` can run the same incremental sync command periodically and keep the dashboard state current.

Each sync also rebuilds a redacted context pack for every discovered project in `09-Exports`. These packs contain only project-scoped records from `02-Global-Knowledge/records.json`, preserve verification and source-session fields, and never upgrade an assumption into a verified fact. The dashboard reports context-pack coverage and memory items that still need review.

Built-in setup adapters remain available for Codex, Claude Code, and Gemini CLI. A future tool can join through the [connector contract](docs/SPEC-connector-contract.md) when it has a validated manifest and supported transport. Registration does not enable or install the connector; those actions remain approval-gated.

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

The install total therefore means **consented, successfully recorded installs**, not every copy or prompt-based setup. A user who declines telemetry, installs manually, or cannot reach the endpoint remains intentionally uncounted.

## Controlled required updates

The public release manifest can mark a minimum supported version. A version below that minimum shows a required-update screen and pauses incremental sync until the user installs the repaired release. This mechanism never edits the Vault or application files automatically. It is intended only for compatibility or security failures; normal releases remain recommended updates.

Required-update enforcement is available to installations running version 0.7.0 or newer. Older copies that never run an updater cannot be remotely controlled.

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
