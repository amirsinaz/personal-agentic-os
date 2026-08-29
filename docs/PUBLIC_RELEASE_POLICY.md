# Public release policy

Public changes are collected before they are released. A detected change creates or updates a private review proposal; it does not create a release or a public changelog entry.

## Release rules

- Publish only after the maintainer explicitly approves the current review.
- Combine all approved, unreleased user-facing changes into one release summary.
- Prefer a release window every two days; urgent compatibility or security fixes may be released earlier when explicitly requested.
- Create one changelog entry per cumulative public release, not per commit or internal change.
- Describe user outcomes. Exclude maintainer workflow, private analytics, local paths, project names, and implementation-only work.
- Keep the website focused on the three most important cumulative releases. GitHub Releases is the complete archive.
- Never commit, push, deploy, or modify the public manifest without explicit approval.

## Approval boundary

Review approval authorizes preparing the generalized public change. Publishing remains a separate explicit action unless the maintainer clearly approves both preparation and publication in the same instruction.
