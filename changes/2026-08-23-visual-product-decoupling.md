---
id: visual-product-decoupling
title: Decouple universal visual intelligence from Starter
status: development-verified
affectedModules: [assembler, marketing, web, mobile]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, AGENT_MAP.md, features/assembler/MODULE.md, /dp]
---

# Outcome

Starter remains a functional Cloudflare/SaaS foundation while the universal visual-intelligence product becomes independently owned at `/opt/1panel/apps/visual`. Generated products can use both the functional `all2cf-project` plugin and the independent Visual plugin without making either one a hard runtime dependency.

# Scope

- Remove visual design execution and Provider ownership from `all2cf-project`.
- Preserve the existing Starter-owned baseline Design Profile as an offline functional fallback.
- Replace the temporary embedded optional Provider Catalog with the independent Visual integration contract once that contract is available.
- Add a minimal versioned Visual Receipt, plugin capability declaration, Factory/Setup connection and explicit unavailable/offline behavior without copying Visual catalogs into Starter.
- Keep official Cloudflare operations and Starter updates independent from Visual MCP availability.

# Verification

- Plugin contract proves `all2cf-project` has no visual design Skill, MCP, Factory or canonical source-release capability.
- Factory-generated products carry only the Visual integration receipt/declaration and keep working when Visual is disabled or unavailable.
- Setup/Factory browser acceptance covers disabled, available and unavailable Visual states without external runtime code in the initial bundle.
- Knowledge, Agent Map, materialization, factory, type/build, bundle and Worker dry-run checks pass.
- Visual contract drift was caught during integration review. Visual corrected it in draft `starter-integration@1.0.1` at commit `9b1482690683cea17773ecd597c809731dcd882b`; Starter requests only the six capabilities marked implemented by the Visual MCP contract and rejects discovery missing any requested capability.
- Full `npm run verify` passes, including Engine Channel/Drizzle flows, all workspaces, three sites, bundle budgets and both Worker dry-runs.
- Factory contract generates 460 files, down from the 551-file embedded-catalog prototype. The product retains one fallback snapshot, no universal Provider Catalog, no cover-preview directory, no StyleKit source commands and no visual Skill in `all2cf-project`.
- Local Setup migration removed stale `designExtensions`, persisted disabled Visual state, restored unavailable/fallback state, and a real Development discovery request returned HTTP 525 as structured `unavailable` while keeping the Starter baseline active.
- Browser acceptance passes four desktop/mobile and light/dark Factory cases with eight screenshots and artifact `59a81faadd5148cb2242f159787df0fb01c1edf3b735397e56aeaac5edceee6d`.

# Release

Development was first verified from commit `7ec954c775ec4b64195c5be24b20a846b5012c8b` with artifact `e173dfd35056f76161076509192de2dffa5e0c893cdd5d37711c0571954d1061`, deployment `6bda1725-af56-4f69-9e83-82ae3058c323` and Worker version `5223c2ec-a943-4aea-8149-2e95930780e7` at 100% traffic on `starter-dev` / `dev.logicm8.com`.

`/`, `/dp`, `/login`, `/api/health`, `/api/version`, `/api/health/database`, auth-method/session/preferences boundaries and an exact-byte R2 put/get/delete proof passed. Live identity was `development / starter / starterdev / starterdev / PostgreSQL 18.4`. The release applied the only pending Development migration, `0009_baseline_query_indexes.sql`; all earlier migrations were already present. Production was not authorized and remains unchanged.
