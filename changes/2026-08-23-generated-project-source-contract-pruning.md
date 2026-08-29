---
id: generated-project-source-contract-pruning
title: Keep canonical source contracts out of generated projects
status: implemented
affectedModules: [assembler]
docsImpact: [PROJECT.md, AGENT_MAP.md, features/assembler/MODULE.md, /dp]
---

# Outcome

Generated projects remain lightweight after universal visual knowledge and Pack templates are pruned. Their verification checks final project output and receipts without trying to run canonical source-library contracts against files they intentionally do not carry.

# Scope

- Remove canonical Factory, Engine, dependency-family, full Design Catalog, Page Catalog, SaaS Catalog and StyleKit-source commands from generated `package.json`.
- Keep generated verification focused on initialization, AI map, functional/Visual plugins, release/database/auth contracts, knowledge/change checks, Worker types, all workspace builds, bundle budgets and Worker dry-runs. Update Channel status/diff remains a separate explicit workflow because a portable candidate has no distribution URL before publication.
- Keep canonical source verification unchanged and mandatory before building an Engine candidate.

# Verification

- Factory contract rejects leaked source-only commands and still requires one fallback snapshot, plugin declarations and zero receipt drift.
- SQL-first and Drizzle portable Engine products install dependencies and pass their generated-project verification.
- Canonical source full verification, reproducible candidate archives and Engine checks pass.

# Release

Implemented locally after the first `2.0.0-dev.14` candidate attempt correctly failed on a source-only Design contract scanning a pruned `packs/` directory. A second attempt correctly rejected `starter:diff` because the pre-publication portable fixture has no Channel URL; the update transport remains covered by the separate Engine Channel contract. No remote state changed during either failed attempt.
