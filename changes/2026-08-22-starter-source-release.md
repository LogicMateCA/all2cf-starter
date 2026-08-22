---
id: starter-source-release
title: Add deterministic Starter source release candidates
status: implementing
affectedModules: [assembler, operations]
docsImpact: [PROJECT.md, ALL2CF_FACTORY.md, features/assembler/MODULE.md, skills/starter-source-release/SKILL.md, /dp]
---

# Outcome

The canonical Starter source will own a repeatable release-candidate workflow instead of relying on hand-built All2CF capsules. A clean exact commit can be inspected, fully verified through SQL and Drizzle portable products, archived twice for reproducibility, checked, and packaged with the strict All2CF Engine manifest and registration receipt.

# Scope

- Add fast source status and strict clean-commit gates.
- Add full source plus SQL/Drizzle portable verification evidence.
- Build the immutable Git archive twice and reject unequal hashes.
- Produce a local ignored Engine candidate bundle without modifying All2CF.
- Add a guarded registration command that defaults to a dry plan and refuses dirty targets.
- Freeze StyleKit upstream synchronization. Engine releases carry the current Starter-owned curated snapshots; future visual work deliberately improves a small owned set.

# Verification

Pre-commit `npm run verify`, Factory contract, Agent Map, materialization, knowledge and Change Spec checks pass in `starter-dev`. The controller correctly reports the working tree as ineligible while this Change Spec is dirty. A clean-commit `2.0.0-dev.9` candidate replay, two-build plus independent check-time archive reproducibility, SQL/Drizzle portable verification and dry registration against the isolated All2CF integration worktree remain the post-commit acceptance gates.

# Release

No Cloudflare, All2CF Development, Production, Expo or store release is authorized by this source-candidate workflow.
