# Vendor-neutral connector contract

Personal Agentic OS can register a future AI tool without adding its name to the core. A compatible connector provides a schema-versioned manifest, one supported transport (`mcp`, `https`, local `file`, or `plugin`), and explicit capabilities.

New connections start disabled, with unknown health and the least-privilege `context:read` scope. Enabling a connector, granting observation or sync permissions, installing a plugin, or supplying credentials always requires separate user approval.

Project context is transferred in a bounded, redacted envelope with a deterministic revision. The revision makes retries idempotent. A connector receives only allowlisted projects and cannot mark an unverified observation as fact.

The public contract never contains credentials, environment values, hidden reasoning, raw tool output, or private filesystem paths.
