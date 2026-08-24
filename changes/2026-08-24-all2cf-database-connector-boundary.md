---
id: all2cf-database-connector-boundary
title: Present CFPG only as an external database connector
status: implemented
affectedModules: [assembler]
docsImpact: [AGENT_MAP.md, .ai/agent-map.json, features/assembler/MODULE.md]
---

# Outcome

Generated-project `/setup` presents `@all2cf/database-connect` as an optional external All2CF database connector, not as a CFPG product owned by Starter. Starter continues to validate the supplied command and receipt-own only the dependency, `pg` alias and Worker binding.

# Scope

Visible Setup labels and guidance now state that the external database remains managed by All2CF Database. Internal `cfpg` Blueprint and receipt identifiers remain unchanged for compatibility. Agent Map routing sends Starter connector work to `project-assembly` and explicitly forbids widening into database provisioning, migrations, backups, runtime upgrades or lifecycle management.

# Verification

Run Agent Map, database-provider, assembly, design, type, knowledge synchronization and knowledge drift checks. SQL-first and Drizzle remain the only product code combinations; no live CFPG database is required or owned by Starter acceptance.

# Release

Implemented in the canonical source candidate. No Engine publication, Development deployment, Production deployment or CFPG mutation is part of this change.
