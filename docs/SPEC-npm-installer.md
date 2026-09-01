# Spec: Hybrid NPM installer and agent migration

## Objective

Make `npx personal-agentic-os@latest` the deterministic entry point for Personal Agentic OS while preserving an agent prompt for project discovery, deduplication, and memory migration that requires semantic judgment.

## Commands

- Install/setup: `npx personal-agentic-os@latest`
- Help: `npx personal-agentic-os@latest --help`
- Dashboard: `npx personal-agentic-os@latest dashboard /absolute/path/to/config.json`
- Sync: `npx personal-agentic-os@latest sync /absolute/path/to/config.json`
- Update check: `npx personal-agentic-os@latest update /absolute/path/to/config.json`
- Test: `npm test`

## Project structure

- `src/cli.js`: public command router and prerequisite report.
- Existing `src/*-cli.js` modules: setup, dashboard, sync, and update implementations.
- `prompts/master-install*.md`: second-stage semantic migration instructions.
- `test/cli.test.js`: executable CLI contract tests.
- Resource Site: install command, migration prompt, bilingual copy, and separate analytics.

## Code style

```js
const commands = new Map([["setup", "./setup-cli.js"]]);
export function resolveCommand(input) { return commands.get(input) ?? null; }
```

Use dependency-free ESM, explicit return values, safe defaults, and no hidden system changes.

## Testing strategy

- Unit-test command resolution and prerequisite reporting with real functions.
- Spawn the packaged CLI for `--help` and `--version`.
- Pack with `npm pack --dry-run` and confirm required runtime assets are included.
- Run repository and Resource Site test/build suites.

## Boundaries

- Always: ask before installing Obsidian or changing user files; keep telemetry opt-in; keep Preview/approval before memory writes.
- Ask first: publish the package to NPM, use NPM credentials, or change the public update policy.
- Never: include private paths/data, auto-install system software, auto-enable telemetry, or claim the NPM command is live before registry publication succeeds.

## Success criteria

- The package is publishable and the NPM name is available.
- `npx personal-agentic-os@latest --help` and `--version` work from the packed artifact.
- Default execution starts the existing approval-gated setup wizard.
- The website presents NPM as installation and the prompt as migration/personalization.
- Install-command and migration-prompt interactions are distinguishable in analytics.

## Open questions

- NPM publication requires the owner's authenticated NPM account and is a separate explicit publishing step.
