---
id: design-page-materialization
title: Materialize owned Design Profiles and Astro Page Packs
status: local-verified
affectedModules: [assembler, marketing, web, mobile, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, PERFORMANCE.md, features/assembler/MODULE.md, features/marketing/MODULE.md, starter.blueprint.json, catalog/catalog.json, design/catalog.json, pages/catalog.json, /setup, /dp]
---

# Outcome

The selected Design Profile becomes deterministic Web, Marketing, Docs, and Mobile tokens, and selected public Page Catalog routes become owned Astro files. The public static site and the React product application can coexist on one Cloudflare Worker without SPA fallback replacing real 404 responses.

# Scope

- Compile the exact Blueprint Design Profile into generated target adapters with receipt hashes and drift protection.
- Add manifest support for route-level Page files so unselected public pages are absent from the assembled application.
- Adapt PowerAI's audited information architecture into owned Core Product and optional Growth Page Packs without its brand, demo content, authentication, or runtime.
- Build Astro public pages at the site root, the React product application under `/_app`, and Starlight under `/docs`.
- Route only product SPA paths through the Worker asset binding; retain static-first public pages and a real `404.html`.
- Keep the empty PostgreSQL baseline unchanged. Design and Page materialization does not add database migrations.

# Verification

- Pin and re-read StyleKit commit `29141b684d5abb967558eb8083fbae91dbbc51b8` and PowerAI Astro commit `a1176bf882bf0b1af98115f3280c2a6928e69261` before adaptation.
- Prove default plan/apply/check, selected route presence, optional Growth selection/removal, design profile switch/removal, package-lock consistency, typechecks, static builds, bundle budgets, and both Worker dry-runs.
- Verify built HTML for selected public routes, absence of unselected routes, React shell routing, Docs output, and real 404 output.
- Visual acceptance for each StyleKit-derived profile requires real browser evidence and cannot be inferred from a successful build.

Implemented evidence:

- Default plan/apply/check produced nine selected Astro routes, four generated Design target adapters, one generated Marketing project contract, and a clean receipt without changing SQL or contacting a database.
- Core Marketing routes built as static HTML with `0KB` initial JavaScript. The merged artifact kept React under `/_app`, Docs under `/docs`, and Pagefind outside the initial Docs script path.
- Selecting the optional Growth pack produced exactly Blog, Case Studies, Integrations, and Careers; deselection removed all four owned files, the rebuilt artifact contained none of those routes, and the receipt returned clean.
- Switching from Owned Neutral to Precision SaaS changed the generated Web, Marketing, Docs, Mobile, and Marketing project outputs to the pinned profile and passed all workspace typechecks and builds. Editorial Signal additionally proved display typography reaches CSS targets and the generic Mobile serif adapter; switching back restored the default profile and clean receipt.
- Local Wrangler served Marketing, React `/login` and `/dp`, Starlight `/docs`, and `/api/health`; `/setup` returned the intended Worker 404 and an unknown browser route returned the static HTML 404.
- Development and Production Worker type generation/checks and dry-run bundles passed with the Static Assets binding and explicit Worker-first route list. No Worker was deployed.
- Playwright checked all nine Core Product Astro routes plus selected Blog, Case Studies, Integrations, and Careers routes. Every audited route returned the expected response without horizontal overflow, console/page errors, or axe violations after correcting invalid definition-list markup and the Contact heading hierarchy.
- All four Design Profiles passed desktop/mobile, light/dark, keyboard, reduced-motion, accessibility, and production-build Lighthouse acceptance. The accepted screenshots show materially different layout language rather than token-only recolors.
- Deselecting every optional Growth route removed all four source routes; the rebuilt production artifact and static server returned 404 for each. The reusable materialization change is locally verified. Individual Page Catalog entries remain `implemented` where real copied-project content, collections, forms, metadata, or evidence are still required.

# Release

No deployment is authorized by this change. Development and Production release state remain unchanged until a later explicit release command.
