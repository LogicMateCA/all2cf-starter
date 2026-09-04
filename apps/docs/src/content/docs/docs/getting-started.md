---
title: Create a project
description: The shortest safe path from Starter copy to a locally verified project.
---

## Start with Codex from the GitHub URL

```text
Use https://github.com/LogicMateCA/all2cf-starter to create my Cloudflare project.
Read CODEX.md and AGENTS.md first, then clone it and run local /setup.
```

Codex does not need the conversation that created Starter. Repository rules, Agent Map, module contracts, Change Specs and the public release receipt provide durable context.

## What happens first

1. Copy or initialize the Starter with the bootstrap workflow.
2. Run local `/setup` and define product identity, platforms, Modules, Providers, pages, the fixed design baseline, and two Cloudflare environment identities.
3. Review the generated `starter.blueprint.json`. This file records intent; it is not a deployment action.
4. Let the controller read the project context and materialize only selected packs.
5. Provision a new empty database from that final selection. Do not carry Starter-era legacy migration or backfill logic into initialization.
6. Run the repository verification gates before asking for a Development release.

## Read these sources in order

- `AGENTS.md` — operating, safety, documentation, and release rules.
- `PROJECT.md` — product purpose and current state.
- `starter.blueprint.json` — selected product shape.
- `catalog/catalog.json` — available Page, SaaS, and Capability packs.
- `integrations/visual.json` — the Visual Design ownership and receipt boundary; Starter itself has no visual catalog.
- `pages/catalog.json` — route ownership, renderer, selection, and acceptance rules.
- the current Change Spec and affected `features/*/MODULE.md` files.

## Empty database rule

A new Starter project begins from an empty PostgreSQL database and applies the current SQL baseline. Existing-product backfills or compatibility migrations do not belong in the Starter baseline; a product that already owns data must design those separately.

## Completion standard

A page render or HTTP 200 is not enough. Completion requires the selected behavior, typechecks and builds, focused contract tests, documentation synchronization, bundle or performance budgets, and the relevant release dry run.
