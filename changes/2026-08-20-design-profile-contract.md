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
- The user explicitly authorized Playwright after the original Chrome connection failed. Each of Owned Neutral, Precision SaaS, Editorial Signal, and Midnight Control was materialized and captured at `1440x900` light and `390x844` dark. All eight accepted captures were visually inspected.
- All four profiles rendered the primary heading in two lines at both sizes, kept the primary action in the first viewport, showed visible keyboard focus, respected reduced motion, produced no horizontal overflow, and returned zero axe violations, console errors, or page errors.
- Production-build Lighthouse runs for every profile scored 100 for Performance, Accessibility, Best Practices, and SEO on desktop and mobile, with `0` CLS and `0ms` TBT. These measurements promote the profile and Marketing adapter contracts to `local-verified`; other target adapters remain independently `implemented`.

# Release

No deployment, database access, or database change is authorized by this contract.
