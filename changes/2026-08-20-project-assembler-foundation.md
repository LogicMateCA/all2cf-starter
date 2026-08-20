---
id: project-assembler-foundation
title: Make Starter a Blueprint-driven project assembler
status: local-verified
affectedModules: [assembler, auth, admin, billing, docs, support]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, starter.blueprint.json, catalog/catalog.json, /dp]
---

# Outcome

Starter now has a canonical Project Blueprint and an AI-readable pack catalog. A copied project can distinguish what was selected from what has actually been generated, verified, or released, and `/dp` can project that state without relying on chat history.

# Scope

- Define `/setup` as the future local configuration entry and `/dp` as its read-only status view.
- Add schemas and initial Design, Page, SaaS, and Capability catalog entries.
- Add Basic Product, Team SaaS, API Platform, and Custom presets plus explicit Google, GitHub, and Apple social-provider selection.
- Record StyleKit and PowerAI as audited donor inputs, MapCN as an optional owned Web capability pack, and OpenSaaS/LastSaaS as reference-only inputs.
- Correct Auth, Admin, Support, Billing, and Docs boundaries so planned functionality is not reported as implemented.
- Feed Blueprint and Catalog data into AI context and the generated `/dp` snapshot.
- Add a local-only `/setup` flow that edits product identity, dual-environment identities, platforms, pack selections, and email provider choice, then transactionally synchronizes identity and `/dp`.
- Reject `/setup`, its subpaths, and `/__starter/*` on deployed Worker builds before SPA asset fallback.

# Verification

- Validate Blueprint selection IDs, lifecycle monotonicity, catalog uniqueness, and environment parity.
- Run `npm run knowledge:sync`, `npm run knowledge:check`, `npm run change:check`, `npm run ai:context`, Web typecheck, and Web build in the project container image.
- Local `/setup` GET and same-state PUT returned 200 with `starter-blueprint/v1` and the Catalog; identity synchronization and `/dp` regeneration completed. Loopback Host/Origin checks reject non-local browser writes.
- Local workerd returned 200 for `/` and `/dp`, and explicit `LOCAL_ONLY` 404 responses for `/setup`, `/setup/identity`, and `/__starter/setup`.
- Full `npm run verify` passed: AI doctor, knowledge/change checks, both generated Worker types, all workspace typechecks, Web build, Web bundle budget, and Development/Production dry-runs.
- Visual design acceptance for `/setup` remains separate from this functional foundation and waits for the owned Design Engine direction.

# Release

No deployment is authorized by this change. Development and Production releases remain unchanged until a later explicit release request.
