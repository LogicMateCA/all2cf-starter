---
id: full-source-download-performance
title: Distribute one full source capsule without loading unselected Packs
status: development-verified
affectedModules: [assembler]
docsImpact: [PROJECT.md, features/assembler/MODULE.md]
---

# Outcome

All2CF may distribute the immutable Engine capsule directly without creating a cloud project. The capsule contains local `/setup`, every Pack template, Provider/Page Catalogs and AI context so configuration happens after download.

Full source is not full runtime. Setup materializes only selected Packs. Engine verification now generates a third portable product with every optional Pack deselected; its materialization receipt may contain only the explicit permanent baseline whitelist, must report `optionalPackCount: 0`, and its own verify command must pass dependency, bundle, Worker dry-run and drift checks. SQL-first and Drizzle configured products remain independently verified.

# Verification

- `npm run factory:contract`
- `npm run starter:materialize:check`
- `npm run bundle:check:web`
- the next `source:release:candidate` must report profiles `sql-first`, `drizzle`, and `minimal`, with `minimal.optionalPackCount = 0` and only whitelisted permanent Pack IDs

# Release

The new Engine Artifact is the Full Source download. All2CF must serve it immutably with its manifest SHA and must not create a project, job or Draft for anonymous download. Connected project cards remain a separate local-connect lifecycle.
