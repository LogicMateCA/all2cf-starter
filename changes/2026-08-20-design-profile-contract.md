---
id: design-profile-contract
title: Enforce Design Profile compile and accessibility contracts
status: local-verified
affectedModules: [assembler, marketing, web, mobile, docs]
docsImpact: [PROJECT.md, DESIGN.md, PERFORMANCE.md, features/assembler/MODULE.md, design/catalog.json, /dp]
---

# Outcome

Every owned Design Profile is compiled through one shared Design Engine and checked offline before any selected profile is materialized. Repository verification now fails on incomplete target adapters, missing reduced-motion policy, invalid dials, donor runtime leakage, duplicate profile contracts, incomplete Web or Mobile output, or core light/dark contrast below WCAG AA.

# Scope

- Extract the Web/Marketing/Admin/Docs CSS and Mobile token compiler from the materializer into a shared, side-effect-free Design Engine library.
- Compile all four profiles during `design:contract`, including profiles that are not currently selected.
- Check foreground, surface, muted text, accent-button text, and danger text in both light and dark modes at a minimum ratio of `4.5:1`.
- Keep StyleKit and PowerAI absent from runtime dependencies while preserving pinned donor provenance.
- Run the contract in every full repository verification without changing the Blueprint, generated files, database, or Cloudflare state.

# Evidence

- All four profiles compile Web and Mobile output for Marketing, Desktop Web, Admin, Docs, and Mobile adapters.
- All 40 checked color pairs pass `4.5:1`; the narrowest current pair is Owned Neutral light muted text at `4.55:1`.
- Profile signatures are distinct and no StyleKit or PowerAI runtime dependency exists in active or optional pack manifests.
- Materialization drift check and all workspace typechecks pass after the compiler extraction.
- A real screenshot audit was attempted through the available Chrome connection, but the browser returned `Target closed`. Product Design rules prohibit silently replacing that capture path with Playwright. Responsive screenshots, keyboard behavior, rendered dark mode, Lighthouse, and profile-by-profile visual comparison therefore remain open and the StyleKit pack remains `implemented`, not `local-verified`.

# Release

No deployment, database access, or database change is authorized by this contract.
