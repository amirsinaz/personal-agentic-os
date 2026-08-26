# Security Policy

Personal Agentic OS is designed for local, single-user operation. The installer must ask before reading a path, writing a file, installing a dependency, enabling telemetry, or creating a persistent service.

## Trust boundaries

- Project files, Obsidian Vault content, prompts, conversations, credentials, and detailed usage records stay on the user's device by default.
- Optional install telemetry is off by default. When explicitly enabled, its payload is limited to a random installation ID, application version, operating system, and install type.
- The public resource website records aggregate interaction counters without cookies or persistent user identifiers.
- LLM providers may receive content that the user sends through their own Codex, Claude Code, or Gemini CLI configuration. This repository cannot override provider-side privacy terms.

## Safe installation

- Review the destination path and proposed files before approving setup.
- Use only project and provider paths you recognize.
- Do not place API keys or credentials in the Vault or configuration JSON.
- Keep telemetry disabled unless anonymous install counting is acceptable.
- Run Preview before Apply; use the generated audit record for Rollback.

## Reporting a vulnerability

Do not publish credentials, personal project data, or an exploit containing real user files. Open a GitHub security advisory for the repository when available, or contact the maintainer privately through the profile linked in the repository.

Include the affected version, reproduction steps using non-sensitive test data, expected impact, and any suggested mitigation.
