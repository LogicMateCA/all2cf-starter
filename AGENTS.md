# Starter project contracts

This repository is a reusable starter. Replace neutral placeholders during project setup; do not treat this file as a build log.

## Operating rules

- Inspect existing code and constraints before changing anything. Keep changes surgical and verifiable.
- Cloudflare facts, APIs, configuration, and operations must be checked through official Cloudflare MCP first. If MCP is unavailable, record the limitation before using another authoritative source.
- Detect Worker Studio MCP capabilities at runtime; never assume a Worker Studio tool or binding exists.
- Sol is the sole controller and chooses reasoning per task: light for bounded inspection or mechanical work, medium for normal implementation and integration, and high for architecture, release, ambiguous cross-module decisions, or high-risk changes. It may raise or lower the level as evidence changes. Luna medium workers receive bounded, independent tasks. Child workers cannot commit or deploy; the controller owns integration and release.
- The generic words “发布” and “deploy” authorize an immediate development deployment after required checks. The explicit phrase “正式发布” or “production” is itself the production authorization; do not add another confirmation step.
- Markdown and frontmatter are the source of truth for `/dp` artifacts. Generated output must not silently become the source.
- Every material code, configuration, schema, dependency, behavior, ownership, Skill, or release-policy change must update one focused Change Spec and every affected canonical Markdown document in the same change. Run `knowledge:sync` and `knowledge:check` before completion so `/dp` never falls behind the repository. Do not edit generated `/dp` JSON directly.
- Use SQL-first PostgreSQL access. Do not add an ORM by default; justify any ORM in a Change Spec.
- Treat every new Starter project database as empty infrastructure built from the final selected baseline. Do not design legacy-data migrations, backfills, dual writes, or compatibility shims here; once a copied product owns data, that product owns its later upgrades separately.
- Route Product Design work through the Product Design skill, and visual/frontend taste work through the applicable taste skill.
- For Cloudflare build, deploy, inspection, or rollback work, read and follow `skills/cloudflare-release/SKILL.md`.
- For copying or initializing this Starter, read and follow `skills/starter-bootstrap/SKILL.md`.
- For Expo/EAS build, update, Apple App Store, Google Play, or rollback work, read and follow `skills/expo-release/SKILL.md`.
- For dependency checks or upgrades, read and follow `skills/runtime-upgrade/SKILL.md`; use current stable compatible versions, not unreviewed prereleases.
- For whole-project understanding, Change Specs, documentation synchronization, or `/dp`, read and follow `skills/project-context/SKILL.md`.
- Keep these contracts current through a Change Spec whenever behavior, ownership, architecture, or release policy changes. A material change is incomplete while its `/dp` source or generated snapshot is stale.

## Scope and safety

Do not delete data, alter production state, or modify database structure outside the explicit request. Run checks proportional to risk and report what was and was not verified.

## Project-specific additions

Add narrower rules in child directories when needed. Child rules may strengthen these contracts but may not weaken release, authorization, or source-of-truth rules.
