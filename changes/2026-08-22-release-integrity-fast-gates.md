---
id: release-integrity-fast-gates
title: Keep release verification non-masking and remove duplicate generation
status: implemented
affectedModules: [assembler, operations]
docsImpact: [RELEASE.md, PERFORMANCE.md, skills/cloudflare-release/SKILL.md, /dp]
---

# Outcome

Verification can no longer silently regenerate tracked Cloudflare Types and deploy them under an older Git commit. The release path performs one Development Plan synchronization, builds sites without regenerating it, and rechecks Git cleanliness after every verification generator.

# Scope

- Make `verify` use `cf:types:check` only. `cf:types` remains an explicit developer generator whose result must be reviewed and committed.
- Add `build:sites` so `verify` does not run `knowledge:sync` once directly and a second time through `build`.
- Recheck `git status --porcelain` after verify and local auth smoke, before artifact hashing or deployment.
- Add an executable release contract that guards command order and post-verification cleanliness.
- Clean the exact recent social-auth rate-limit residue created by the Development-edge Google authorization probe so release verification does not make an otherwise empty Starter database non-empty.

# Verification

- Pending release contract, full verification and a deliberate stale-types failure drill.

# Release

No release yet. Development and Production remain unchanged.
