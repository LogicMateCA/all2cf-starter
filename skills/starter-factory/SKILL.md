---
name: starter-factory
description: Generate an independent AI-ready product from the canonical Starter source through local /factory or the deterministic Factory CLI. Use for creating a new Starter project or portable project package; do not use for modifying an existing generated product.
---

# Starter Factory

Create from the canonical source only. A generated product is a separate Git repository with `/setup`, a source receipt, selected materialization receipt, focused Agent Map and `/dp`. It retains compact Catalog and StyleKit reference snapshots for AI/docs, but never the reusable Pack templates or canonical source-release controller.

## Create

1. Require a clean source commit. Dirty generation is permitted only for an explicitly disposable proof with `--allow-dirty`; never present that artifact as a customer or release candidate.
   A hosted All2CF job may instead use `STARTER_FACTORY_SOURCE_COMMIT` after it independently verifies an immutable source capsule's SHA-256. Do not use that override for a mutable local checkout.
2. Use local `/factory` for the reviewed Blueprint/Provider flow, or run `npm run factory:create -- --slug=<slug> --name="<name>"` in `starter-dev`.
3. Inspect `.starter/generation-report.json` and `.starter/source.json`. Require the exact source commit, `sourceDirty: false`, a distinct project identity, `/setup`, a clean initial Git commit and a portable archive.
4. Run `npm run starter:status` and `npm run starter:diff` inside the generated project. Fresh output must report installed Packs and zero drift.
5. Install dependencies only when opening the project for development. The portable package deliberately excludes `node_modules`, build/test output, credentials and source libraries.
6. Run project type/build checks before handoff. Creation does not authorize Cloudflare or App release.

Use `skills/starter-bootstrap/SKILL.md` only when provisioning the generated project's infrastructure or performing its first Development release.
