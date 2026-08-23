---
id: starter-update-release-skill
title: Preserve the verified Starter update and release workflow as a Skill
status: local-verified
affectedModules: [assembler, operations, docs]
docsImpact: [AGENTS.md, PROJECT.md, AGENT_MAP.md, skills/starter-update-release/SKILL.md, /dp]
---

# Outcome

Future agents route “检查 Starter 更新”, Development Engine publication and explicit Stable/Production promotion through one discoverable Skill instead of relying on chat history. The Skill composes the already verified runtime-upgrade, source candidate, All2CF R2/Channel, paid resolution and Development Worker workflows.

# Verification

Skill package validation passes with no scaffold placeholders. Read-only update inspection reports clean Engine `2.0.0-dev.13`, aligned Better Auth `1.7.1`, current Expo SDK 57 compatibility, and a bounded set of stable updates for later review without mutating source or Channels.

Independent forward-testing confirms check mode cannot reach Engine/R2/Worker/Production mutation. It also tightened the Node 24 container rule and replaced `npx expo` with the repository-installed Expo CLI so the compatibility check cannot silently install a missing CLI.

# Release

Documentation/agent behavior only. No additional Worker or Channel mutation is authorized by the Skill itself.
