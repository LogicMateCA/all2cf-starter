---
id: starter-update-release-skill
title: Preserve the verified Starter update and release workflow as a Skill
status: development-verified
affectedModules: [assembler, operations, docs]
docsImpact: [AGENTS.md, PROJECT.md, AGENT_MAP.md, skills/starter-update-release/SKILL.md, /dp]
---

# Outcome

Future agents route “检查 Starter 更新”, Development Engine publication and explicit Stable/Production promotion through one discoverable Skill instead of relying on chat history. The Skill composes the already verified runtime-upgrade, source candidate, All2CF R2/Channel, paid resolution and Development Worker workflows.

# Verification

Skill package validation passes with no scaffold placeholders. Read-only update inspection reports clean Engine `2.0.0-dev.13`, aligned Better Auth `1.7.1`, current Expo SDK 57 compatibility, and a bounded set of stable updates for later review without mutating source or Channels.

Independent forward-testing confirms check mode cannot reach Engine/R2/Worker/Production mutation. It also tightened the Node 24 container rule and replaced `npx expo` with the repository-installed Expo CLI so the compatibility check cannot silently install a missing CLI.

The first complete `2.0.0-dev.14` All2CF publication exposed a database-identity hazard: inheriting `DATABASE_URL` from `a2c-console-dev` could advance a Channel outside the isolated Cloudflare Development database. The Skill now requires `/opt/1panel/apps/a2c-dev/config/all2cf-updates-dev.env`, database/user `a2cdev / a2cdev`, and publisher identity `starter-updates-development@all2cf.local`. All2CF publisher and paid-proof commands enforce the same identity and reject a wrong database before mutation. Skill validation and the fail-closed negative tests pass.

The customer product-flow acceptance exposed additional transport-only false positives: a missing Better Auth canonical Development origin, an omitted Runner Secret, a stale VPC Tunnel/hostname, and an Agent Dockerfile missing modules imported outside `runner/`. The Skill now requires exact Tunnel/VPC/Agent identity plus authenticated API and browser proofs. A successful Runner health response is insufficient without real generation, entitlement, Token, tenant-isolation and cleanup evidence.

# Release

The workflow is Development-verified with Engine `2.0.0-dev.14`, private R2 Artifact SHA-256 `6e73bc0a1f3cea398084cbf1d3c1e6df29dc0371c87b0cb3c027eb6eb2dab8f0`, All2CF commit `beb1931523e8430a2602f110ead211350f554e4f`, Worker version `1d4d0c5d-6d8a-4b9c-b00f-c4fda9456138`, and a healthy Development Agent image. Paid project-token resolve, one-use download, downloaded SHA verification, real source generation, tenant isolation, browser/mobile acceptance and cleanup passed. Stable and Production remain unchanged; the Skill itself does not broaden release authorization.
