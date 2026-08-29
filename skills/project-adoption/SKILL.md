---
name: all2cf-project-adoption
description: Adopt an older or independently built project into the All2CF Starter AI-context and maintenance contract without replacing its business code or custom design. Use for legacy-project onboarding, Starter infrastructure adoption, or automatic Agent Map bootstrap.
---

# Project adoption

Use deterministic adoption scripts for infrastructure and AI context. Do not copy the complete Starter into an older project and do not infer permission to rewrite product behavior, product schema, or custom visual design.

For a first adoption, locate the canonical Starter checkout and run these against the target project:

1. `npm run project:adopt:scan -- --root <project>` — read-only discovery.
2. `npm run project:adopt:plan -- --root <project>` — inspect `keep`, `adopt`, `merge`, and `review` decisions.
3. `npm run project:adopt:apply -- --root <project>` — install only the bounded AI-context and adoption runtime. This creates a timestamped backup before merging existing contract files.
4. `npm run project:adopt:verify -- --root <project>` and then run the target project's own tests.

After first adoption, work from the target project itself:

- Read `AGENTS.md`, `AGENT_MAP.md`, `.starter/adoption.json`, and one matched route only.
- Run `npm run starter:adoption:status` before broad inspection.
- Review `.ai/feature-adoption-candidates.json`; register accepted business domains in `.ai/features.json` and run `npm run agent-map:refresh`.
- Run `npm run starter:adoption:verify` after context or ownership changes.

Automatic apply is limited to foundation routing files, receipts, package scripts, and the self-contained adoption runtime. Feature candidates are never bulk-registered because directory names do not prove ownership. If a reusable foundation bug is found, fix the product as needed and port the generalized correction and regression contract to the canonical Starter.

Stop before applying when the scan identifies malformed JSON, an unknown existing Agent Map schema, or a target that is not the intended project root. Applying does not authorize deployment, database migration, dependency upgrade, or production changes.
