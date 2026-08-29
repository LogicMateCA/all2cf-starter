---
id: independent-project-factory
title: Generate independent AI-ready projects from one Starter source
status: implementing
affectedModules: [assembler, docs, operations]
docsImpact: [AGENTS.md, AGENT_MAP.md, ALL2CF_FACTORY.md, PROJECT.md, ARCHITECTURE.md, PERFORMANCE.md, RELEASE.md, features/assembler/MODULE.md, features/docs/MODULE.md, skills/starter-bootstrap/SKILL.md, skills/starter-factory/SKILL.md, skills/starter-maintenance/SKILL.md, /dp]
---

# Outcome

The canonical repository becomes a local Project Factory. It reads reusable Catalog, Pack and StyleKit sources from one immutable source root while writing selected runtime code, identity, receipts and AI context into a separate product root. Generated products retain local `/setup` for their own configuration and can inspect or apply later source changes without copying the complete source library.

# Scope

- Separate `sourceRoot` from `projectRoot` in identity synchronization and Pack materialization.
- Add deterministic create, status, diff, add and update lifecycle commands with safe target paths and source receipts.
- Generate a product-specific handoff, Git baseline and verification report without copying build output, source history, credentials or the complete reusable Catalog/Pack/StyleKit library.
- Rename the source repository creation surface to `/factory`; generated projects retain `/setup`.
- Prove the workflow against a disposable sibling project before extracting operational Skills or an All2CF service wrapper.

# Verification

- `factory:contract` generates a disposable independent Git project, verifies `/setup`, source receipt, 11 installed Packs, absence of Catalog/Packs/node_modules, a clean initial commit and zero-drift status/diff. It then adds TOTP 2FA and proves a product-modified receipt-owned file blocks update. The current proof contains 447 entries under the 700-entry budget.
- A separate `factory-proof` project routes an Auth task through its own clean AI Context, installs its dependencies, and passes all Web/Worker/Mobile/Astro type checks plus the complete three-site build.
- The same proof adds the previously unselected TOTP 2FA Pack, including code, SQL, routes, Better Auth registries, Wrangler changes and receipt; subsequent diff is empty and update is idempotent.
- Source `/factory` passes four desktop/mobile light/dark browser cases. A real PUT preserves the exact canonical Blueprint/config hashes and writes only the ignored Factory Draft.
- The complete repository verification passes, including the Factory contract, knowledge synchronization, source materialization, all types/builds/budgets and both Cloudflare configuration dry-runs.
- Generated-project `/setup` passes four desktop/mobile light/dark browser cases with eight screenshots and zero failures. Clean-source Factory API generation returns HTTP 201 from exact source commit `28a418e` with `sourceDirty: false`.
- Portable archive generation is part of `factory:contract`. The verified create/add/update/conflict workflows are now captured in focused `starter-factory` and `starter-maintenance` Skills.
- `ALL2CF_FACTORY.md` now fixes the future asynchronous job and typed MCP boundary around the same engine. Hosted jobs, artifact storage and GitHub delivery remain planned until exercised end to end.

# Release

No release authorized. Development and Production remain unchanged.
