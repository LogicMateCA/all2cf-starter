---
name: all2cf-project-adoption
description: Adopt an older or independently built project into the All2CF Starter AI-context and maintenance contract without replacing its business code or custom design. Use for legacy-project onboarding, Starter infrastructure adoption, or automatic Agent Map bootstrap.
---

# Project adoption

Use the canonical Starter adoption runner for the first connection. It scans and plans without mutation, then installs a self-contained project runtime. Do not copy the complete Starter, rewrite business code, replace product schema, or overwrite custom design.

For first adoption, locate the available canonical Starter checkout and run `project:adopt:scan`, `project:adopt:plan`, `project:adopt:apply`, then `project:adopt:verify` with `--root <target>`. If the checkout or an All2CF-provided adoption artifact is unavailable, report that bootstrap dependency instead of recreating the migration by hand.

After adoption, operate entirely from the target project:

- Read `AGENTS.md`, `AGENT_MAP.md`, `.starter/adoption.json`, and one matched Agent Map route.
- Run `npm run starter:adoption:status` before broad inspection.
- Review `.ai/feature-adoption-candidates.json`; only accepted domains belong in `.ai/features.json`.
- Run `npm run agent-map:refresh` and `npm run starter:adoption:verify` after ownership changes.

Automatic application is limited to AI routing, ownership receipts, package scripts and the adoption runtime. It does not authorize deployment, database migration, dependency upgrades, or production changes.
