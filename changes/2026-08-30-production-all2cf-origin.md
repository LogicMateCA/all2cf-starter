---
id: production-all2cf-origin
title: Prefer the authorized All2CF service origin
status: verified
affectedModules: [assembler]
docsImpact: [apps/docs/src/content/docs/docs/guides/all2cf-connection.md]
---

# Outcome

An OAuth-connected project uses the `updateServiceUrl` returned in its ignored
project authorization receipt. The source receipt is only a fallback before a
project-specific authorization exists. This prevents a project generated or
tested against Development from continuing to call Development after it is
connected to Production.

# Verification

- Engine Channel contract writes an unreachable service URL into
  `.starter/source.json` and the working URL into
  `.starter/update-auth.local.json`.
- Status succeeds only when the project authorization receipt takes precedence.
- The local `/maintenance` authorization request records
  `https://app.all2cf.com` when no explicit Development override is supplied.

