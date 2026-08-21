---
id: development-scoped-provisioning
title: Keep Development provisioning out of Production
status: development-verified
affectedModules: [assembler, release]
docsImpact: [features/assembler/MODULE.md, skills/cloudflare-release/SKILL.md, package.json, /dp]
---

# Outcome

A Development release can reconcile newly selected Development infrastructure without connecting to, changing, or creating any Production database, Hyperdrive, or Queue.

# Scope

- Add explicit `development`, `production`, and `all` targets to `starterctl provision`.
- Add `starter:provision:dev` and `starter:provision:production` commands while retaining the original all-environment command for deliberate first initialization.
- Preserve the official Cloudflare MCP preflight receipt, collision checks, idempotent resource identity checks, state recording and receipt-owned Wrangler configuration.
- Use the Development-only path for the selected `starter-dev-outgoing-webhooks` Queue required by this release candidate.

# Verification

- Record a fresh official Cloudflare MCP snapshot for both Workers/domains, the Development VPC service, and both Hyperdrives.
- Run Development provisioning and verify that only the Development Queue is created, its consumer targets `starter-dev`, and no Production resource timestamp or deployment changes.
- Run full repository verification before release.

# Release

Development-only provisioning created Queue `starter-dev-outgoing-webhooks` as resource `e96db5dd676c4229b84474091dbb00c1`. Official Cloudflare MCP read-back confirmed one `starter-dev` producer and consumer, while the Production deployment stayed at `d74877e3-87c9-4d05-a592-7d7a64c1017e` and no `starter-outgoing-webhooks` Production Queue was created.
