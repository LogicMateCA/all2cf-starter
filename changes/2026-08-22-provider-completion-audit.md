---
id: provider-completion-audit
title: Enforce Provider Catalog completion invariants
status: development-verified
affectedModules: [assembler, docs, mobile]
docsImpact: [PROJECT.md, features/assembler/MODULE.md, features/docs/MODULE.md, catalog/providers.json, /dp]
---

# Outcome

The Provider Catalog contract rejects any externally configured selectable option that lacks a real verification action or official setup link, and pins credential names for the highest-risk optional and release providers.

# Scope

- Require every selectable non-`None` option to expose a verification action.
- Require official setup links when a selectable option owns credentials, Bindings, dependencies or non-baseline delivery.
- Pin Turnstile, Expo Push, Twilio and all release-platform credential names to the actual Setup/release implementation.
- Correct Expo Push from the nonexistent `EXPO_ACCESS_TOKEN` Catalog name to the implemented `EXPO_PUSH_ACCESS_TOKEN` name.

# Verification

- The strengthened contract passes 17 categories, 63 options, 45 selectable choices and 17 explicitly unavailable Planned choices.
- Completion audit finds no selectable external option without a verification action or official setup link.
- Development release `d5ef7034a047516281b04df393b89fa7229fb949` passed the strengthened contract, full repository gates, remote auth checks, exact database identity and the selected R2 release round trip. Live `/dp` contains the corrected Expo Push credential name and completion invariants.

# Release

Development is verified. The latest exact commit/artifact/deployment/version tuple remains in the environment-scoped release ledger so later releases do not require editing this historical Change Spec. Production remains unchanged.
