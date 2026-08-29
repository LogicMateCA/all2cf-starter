---
id: stylekit-global-control
title: Make a selected StyleKit style control every Web surface
status: local-verified
affectedModules: [assembler, marketing, auth, admin, support, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    DESIGN.md,
    features/assembler/MODULE.md,
    starter.blueprint.json,
    catalog/catalog.json,
    design/catalog.json,
    /setup,
    /dp,
  ]
---

# Outcome

The owner selects a StyleKit style such as `neumorphism` once. AI receives a pinned, complete, machine-readable style contract and every Web surface renders the same visual language without per-page redesign.

# Source and ownership

- Pin StyleKit commit `29141b684d5abb967558eb8083fbae91dbbc51b8` and retain MIT provenance.
- StyleKit is the audited design-source library. Its 146 entries are not 146 interchangeable whole-site themes: some are layouts, component/effect recipes, page archetypes or narrow art directions. Do not expose them all as a global style selector and do not compress the eligible systems into a few unrelated Starter themes.
- Classify every source entry as a whole-product base visual, close style variant, layout, density pattern, enhancement, or reference/content direction, with an explicit eligibility reason. Only reviewed base visuals may become the Blueprint's style lock. Close variants, layouts and enhancements remain separately composable; reference/content entries remain available to AI but cannot silently control a product.
- Keep the whole-product selector between 24 and 30 genuinely distinct systems. Dark mode, monochrome palettes, pastel palettes, close soft-depth variants and tone-only variations do not consume global slots. Cultural systems are included only when their pinned source supplies an independent visual grammar that can survive Marketing, Product, Admin and Docs adaptation.
- Selection creates a Starter-owned immutable snapshot containing the source slug/revision and hashes, tokens, component recipes, AI rules, required and forbidden patterns, interaction states, reference assets, quality requirements, and per-target adapter status.
- Generated products do not depend on StyleKit APIs, Next.js, Supabase, registry services, or automatic upstream updates. StyleKit refresh is an explicit reviewed upgrade that creates a new internal snapshot version.

# AI control contract

- Before changing a visual surface, AI must read the selected style lock, manifest, rules, target adapter, registered recipes, page/function contract, and `/dp` lifecycle state.
- Page code composes semantic primitives and registered patterns. Direct colors, shadows, radii, theme globals, and unregistered component-level visual systems fail the design boundary check.
- Required primitives include surface, navigation, button, input, selection, account menu, notification bell/inbox, card, table, form, dialog, tooltip, toast, badge, chart frame, empty/loading/error/permission states, and responsive shell regions.
- Marketing, Auth, Product, Admin, Docs, Setup, and DP may vary layout and density but may not change the selected style's color, light/depth, shape, typography, state, and motion language.
- Expo keeps a separate native component template and adapter. It may inherit approved brand semantics, but Web CSS and DOM components are never forced into the native client.

# Neumorphism acceptance slice

- Use `neumorphism` as the first end-to-end proof because it exposes whether the compiler handles fixed upper-left light, dual shadows, raised/recessed/pressed semantics, form states, and forbidden hard-border behavior rather than merely changing colors.
- Preserve obvious focus, error, disabled, selected and unread signals in addition to depth; do not communicate state by shadow alone.
- Provide independently reviewed light and dark contracts, reduced motion, dense Admin tables, keyboard navigation, contrast, no horizontal overflow, and performance budgets.
- Verify Marketing, login/verification, Product Shell, Bell, Account menu, Dashboard, Settings, Support, Admin, Docs, Setup and DP with real browser screenshots before claiming the adapter verified.

# Setup and Development Plan

- `/setup` browses a curated global-system catalog with search, tags, source preview, component/state preview, known quality risks, snapshot version and target readiness. It may offer compatible layout/effect enhancements in a separate step, but never mixes them into the base-style choice.
- The Blueprint pins `source=stylekit`, slug, source revision, owned snapshot version, and adapter policy instead of only a weak profile name.
- `/dp` shows selected style provenance, snapshot hashes, AI rules entrypoint, target adapter status, visual evidence and any page that bypasses the registered system.

# Verification

- Starlight search, theme controls, and inline code must retain WCAG AA contrast in both modes after every selected StyleKit adapter is generated.

- Snapshot extraction and compile are deterministic from the pinned source and fail on unreviewed source drift.
- Static checks reject unregistered design values, direct donor runtime imports, missing interaction states, target adapter gaps and pages that bypass the semantic component layer.
- Browser and accessibility checks cover all required surfaces, modes, breakpoints and states. Build budgets prove the selected style does not ship the whole StyleKit catalog.
- Run `knowledge:sync`, `knowledge:check`, `change:check`, `design:contract`, all relevant type checks/builds, and real browser acceptance.

# Current implementation evidence

- The pinned 146-entry inventory is fully classified as 28 deliberately distinct whole-product systems, 35 composable style variants, 18 source-native layouts, one independent Admin density pattern, 11 enhancements and 53 reference/content-specific entries. No item remains pending and variants/layouts/effects do not inflate the global-system count.
- Every eligible system has an immutable `2.2.0` snapshot with source artifacts and hashes, source palette, recipe coverage, AI rules, required/forbidden patterns, Mobile semantics and Web/Marketing/Docs compiler inputs. The 28 systems map to nine active owned structural adapter families plus optional style-signature layers. Japanese Fresh, Wabi-Sabi, Kawaii Minimal, Ukiyo-e Digital and Cyber Wafuu remain visibly distinct; Chinese futuristic, Islamic geometric, Indian festive and African textile systems add other cultural grammars without replacing general SaaS foundations.
- `/setup` loads a compact committed snapshot index, displays the pinned StyleKit source cover for every eligible style and can select any of the 28 systems. It no longer renders every option with the same CSS mini-window. Selection updates the exact slug, source revision, snapshot version, snapshot hash and derived Design Profile pointer; save validates the chosen snapshot before changing canonical files.
- The compiler accepts all 28 snapshots and emits style-specific shared tokens plus React Web, Astro Marketing and Starlight Docs component layers. Only `neumorphism` receives the Neumorphism target adapter; other systems begin from neutral target semantics, then apply their family and optional owned signature. The selected Neumorphism snapshot is materialized across Web, Marketing, Docs and Mobile; `stylekit:boundary` rejects local gradients, literal colors and non-semantic shadows outside narrow reviewed exceptions.
- `stylekit:contract` verifies all 28 snapshot hashes, source/bundle provenance, button/card/input recipe coverage, target contracts, adapter compilation, 728 foreground/muted/accent/danger contrast pairs across ordinary and strong surfaces, selector bounds, variant separation and absence of donor runtime dependencies. Passing `STYLEKIT_SOURCE` additionally verifies the external pinned source.
- The selected Neumorphism slice previously passed public Worker, authenticated Worker and disposable Growth browser matrices across desktop/mobile and light/dark modes. The refreshed 28-cover Setup selector passed four current desktop/mobile, light/dark cases with eight screenshots, zero browser/accessibility/subresource failures, and manual review of the full selector at `test-results/browser-acceptance/2026-08-20T23-53-47-473Z/local-setup`. This proves the selector and source covers, not full-page visual acceptance of the other 27 adapters; those remain selectable, deterministic and contract-verified until a product chooses them.

# Release

No deployment is authorized by this change. Development and Production remain unchanged until their respective release commands are used.
