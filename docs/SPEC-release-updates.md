# Spec: Releases, weekly update checks, and version adoption

## Objective

Publish every approved public release across GitHub and myagenticstack.com, notify installed dashboards of newer versions, and report consented active installs by version without collecting project data.

## Contracts

- `https://myagenticstack.com/version.json` is the public release manifest.
- A local check runs at most once every seven days and writes only local update state.
- Network telemetry remains opt-in and contains only random install ID, installed version, platform, and install type.
- Updates are never applied automatically; the dashboard links to release instructions.
- Private analytics reports actual consented installations by current version and 30-day activity.

## Success criteria

- A newer semantic version produces a visible dashboard notice.
- Disabled telemetry makes no telemetry request.
- The site changelog and manifest identify the same current release.
- Version checks update an existing anonymous installation instead of creating duplicates.
- Tests reject extra telemetry fields, including project data and local paths.

