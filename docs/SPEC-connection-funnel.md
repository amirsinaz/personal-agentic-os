# Spec: Public connection and memory funnel

## Objective

Guide a user from selecting AI tools to a continuously updated local memory and dashboard without importing private creator data or merging unrelated projects.

## Funnel

1. Detect and confirm the user's AI tools.
2. Confirm each tool's local data source and permissions.
3. Discover project candidates and group copies of the same project by path, repository identity, or strong content-marker overlap.
4. Show the proposed canonical project map and require approval before writing memory.
5. Build or update the local Obsidian memory and install only selected adapters.
6. Run incremental sync and rebuild the dashboard state.
7. Offer an approval-gated recurring sync so existing and future tools remain current.

## Boundaries

- Never copy raw transcripts, credentials, hidden reasoning, or unrelated files into memory.
- Never merge projects from name similarity alone.
- Never install a connector, persistent job, or update without explicit approval.
- Keep tool connections independently configurable.
- Record missing evidence as unavailable instead of guessing.

## Success criteria

- The connection registry includes only tools selected by the user.
- Project copies sharing an exact path or repository identity are grouped.
- Content-marker grouping requires a strong overlap and at least two markers.
- The wizard exposes the proposed project map before the first sync.
- The saved state includes connection and canonical-project summaries.
- The master prompt covers discovery, approval, initial transfer, recurring sync, adding a new tool, and dashboard verification.
