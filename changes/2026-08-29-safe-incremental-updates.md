---
id: safe-incremental-updates
title: Preserve customer changes during incremental Starter updates
status: local-verified
affectedModules: [assembler, ai-context]
docsImpact: [AGENTS.md, CODEX.md, PROJECT.md, ARCHITECTURE.md, Docs, CHANGELOG.md, /dp]
---

# Outcome

Starter updates use the materialization Receipt as the Base side of a conservative Base/Local/Target comparison. Product-only changes are retained, Starter-only changes are safe to apply, and simultaneous changes block automatic update. No customer file or dependency version is silently overwritten.

# Scope

- Classify plans as safe changes, preserved customer changes and conflicts.
- Preserve a locally modified Starter-managed file when the target Starter content is unchanged.
- Preserve a locally changed receipt-owned dependency when the target Starter version is unchanged.
- Block files or dependencies changed by both product and Starter.
- Keep unmanaged-file collisions and modified removals fail-closed.
- Record local overrides in `.starter/materialization.json` without materializing unselected Pack code.
- Expose Safe, Customer changes kept and Conflict counts in `/maintenance` after diff.
- Retain the existing touched-file backup/restore transaction around materialization failures.
- Create an ignored compressed recovery snapshot before update, verify the current project before application, run TypeScript and build after application, and restore the snapshot if post-update verification fails.
- Add always-installed `foundation.core` ownership for the curated Starter infrastructure that must evolve globally, while keeping product business files outside the list.

# Verification

- Engine Channel contract proves local file preservation, local dependency-version preservation, simultaneous file conflict refusal, forced post-update verification rollback, compressed recovery snapshot, receipt advancement, diff, add, update and cleanup.
- Factory contract proves generated projects carry `foundation.core` ownership for Maintenance UI, local updater and materializer without carrying the Pack source library.
- Maintenance contract, materialization, typecheck, Web build, Knowledge and Change Spec gates pass.
- Automatic text conflict merging is intentionally excluded. Codex may propose a merge, but the user must approve it before application.

# Release

Canonical Starter source only. A new Engine/public release is required before customer projects receive this behavior. No remote update, database migration, Development deployment or Production deployment is authorized by this source change.
