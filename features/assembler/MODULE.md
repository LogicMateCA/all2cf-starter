---
module: assembler
status: local-verified
source: starter
---

# Project assembler module

Purpose: turn a product brief and explicit `/setup` selections into a small, owned, verifiable project instead of copying every possible feature into every new repository.

- `/setup` is the local configuration workspace. It collects identity, platforms, design profile, page packs, SaaS modules, capability packs, providers, and environment choices. Deployed Development and Production Workers reject `/setup` and its local API.
- The Pages step reads `pages/catalog.json` and selects routes individually. Required auth, legal, docs, home, and 404 surfaces cannot be removed; selecting an optional growth route selects its backing pack, while removing the last route removes that pack.
- Saving a project plan writes the Blueprint and `starter.config.json`, then reuses the transactional identity synchronizer and regenerates `/dp`. A first copied-project identity change must replace canonical Starter resource names.
- `starter.blueprint.json` is the canonical selection and realization record. It distinguishes selected, materialized, locally verified, Development verified, and Production released states.
- `catalog/catalog.json` is the AI-readable internal catalog. Every pack declares targets, ownership, provenance, update policy, requirements, conflicts, performance constraints, verification, documentation impact, and a delivery mode: permanent `baseline`, receipt-backed `materializer`, or unavailable `planned`.
- `design/catalog.json` is the owned profile layer beneath the Design pack. `/setup` selects one exact profile/version and automatically keeps its backing Design pack consistent; AI consumes the same semantic direction and adapter readiness through project context.
- The shared Design Engine is side-effect-free. `design:contract` compiles all profiles, checks five target adapters, both color modes, reduced motion, dial ranges, distinct profile signatures, pinned donor provenance, and donor-runtime absence before the selected profile can pass repository verification.
- Catalog presets provide executable starting points for Basic Product, Team SaaS, and Custom projects. Planned packs remain visible but disabled, cannot enter a preset, and are rejected if AI edits the Blueprint directly. A manual deviation from a preset becomes `custom`.
- Materialization is additive and deterministic. `npm run starter:materialize` produces a read-only plan, `starter:materialize:apply` applies selected pack manifests, and `starter:materialize:check` fails on drift. Pack files, page-specific files, dependencies, lazy client routes, exact Worker capability routes, generated `run_worker_first` entries, Better Auth server/client registries, generated per-target Design adapters, generated Marketing project data, and lifecycle state share one receipt under `.starter/materialization.json`.
- Deselection is a first-class transition. `/setup` keeps `materialized: true` while changing `selected` to false, clears stale verification/release claims, and lets `/dp` show that removal is pending. Successful apply removes receipt-owned output and then clears the materialized state.
- Removal is ownership-safe: a deselected pack removes only files and exact dependency versions recorded in its receipt. If generated code or a managed dependency changed afterward, removal fails instead of deleting project work. Package installation and source writes roll back on a failed apply.
- Unselected pages, database tables, bindings, secrets, routes, and runtime dependencies are not generated or hidden behind runtime feature flags. Optional pack templates remain in `packs/` as assembler inputs and do not enter the Worker asset graph.
- Database assembly always targets a new empty database. The Blueprint encodes this as a machine-checked policy (`postgresql`, `sql-first`, `empty`, `selected-pack-baseline`, `out-of-scope`). Selecting a pack adds its current baseline SQL before first provisioning; deselecting removes that SQL before provisioning. Existing-product migrations, data backfills, and dual-write compatibility do not belong to Starter.
- AI may recommend and prefill selections, but it must show conflicts and consequences before changing the Blueprint. The controller owns integration and release.
- `/dp` is a read-only projection of the Blueprint, Catalog, Markdown contracts, code status, and release evidence. Its lifecycle matrix separates reusable Catalog readiness and delivery mode from the current Blueprint's selected, materialized, locally verified, Development verified, and Production released states. It never edits the Blueprint.

StyleKit, PowerAI, and MapCN are donor inputs to owned packs, not permanent upstream runtime services. OpenSaaS, LastSaaS, Open Design, and RunCopilot remain reference sources. Better Auth core and every selected official plugin, including Organization, API Key, Expo, and Stripe, are the tracked stable-compatible upstream family.

Google is the only currently executable social login provider. GitHub and Apple are not selectable placeholders; each needs its own Worker, Web, Mobile, secret, callback, and verification adapter before it may enter the Blueprint.

The materializer is locally verified through complete MapCN and Better Auth SaaS pack select, plan, apply, empty-schema, workerd, build, check, deselect, safe-removal, and dependency-absence cycles. Organization-only, Stripe-only, and combined Organization plus Stripe selections passed independently. Design Profile switching and optional Growth route selection/removal also passed real browser acceptance. The Design packs and MapCN capability are locally verified; Page packs remain `implemented` because copied projects still owe real content, collections, metadata, forms, and product evidence. `/setup` still saves intent rather than running commands itself; AI must show the plan and invoke apply.
