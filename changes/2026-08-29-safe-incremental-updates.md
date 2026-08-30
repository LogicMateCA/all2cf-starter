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
- Explicitly release `AGENTS.md`, `AGENT_MAP.md` and `CODEX.md` from foundation ownership without deleting them. Customer feature routes and project rules remain product-owned; Starter AI additions arrive through structured feature registries, generated machine maps, plugin Skills and reviewed Change Specs.
- Apply the same Base/Local/Target preservation rule to generated route, Auth, Worker feature/event, Workflow, Durable Object, storage adapter, Design and Marketing registries.
- Refuse case-insensitive target collisions and symbolic-link traversal before reading or writing managed paths.
- Serialize `add` and `update` with an ignored exclusive project lock so concurrent AI sessions cannot apply overlapping mutations.
- Keep environment files, secrets, project business files, native mobile directories and unregistered package scripts outside automatic ownership.

# Verification

- Engine Channel contract proves local file preservation, local dependency-version preservation, simultaneous file conflict refusal, forced post-update verification rollback, compressed recovery snapshot, receipt advancement, diff, add, update and cleanup.
- Factory contract proves generated projects carry `foundation.core` ownership for Maintenance UI, local updater and materializer without carrying the Pack source library.
- Factory contract proves customer additions to `AGENT_MAP.md` survive update and the three project AI Markdown files are absent from foundation ownership.
- Factory contract refuses case-insensitive file collisions and symbolic-link materialization targets.
- Engine Channel contract refuses a concurrent update lock.
- Maintenance contract, materialization, typecheck, Web build, Knowledge and Change Spec gates pass.
- Source/Public release contracts classify always-installed `foundation.core` as permanent infrastructure while continuing to require `optionalPackCount: 0` for the minimal runtime.
- Automatic text conflict merging is intentionally excluded. Codex may propose a merge, but the user must approve it before application.

# Release

The reviewed release target is Starter Engine `2.1.2`, dated `2026-08-30`. Candidate verification, reproducible Artifact identity, SQL/Drizzle generated-project evidence and All2CF Development integration must pass before the release is available to connected projects. This source commit does not authorize Stable, Production or destructive database work.
