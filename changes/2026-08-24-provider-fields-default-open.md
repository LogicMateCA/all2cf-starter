---
id: provider-fields-default-open
title: Show configuration fields for selected Providers
status: local-verified
affectedModules: [assembler, auth, mobile]
docsImpact: [features/assembler/MODULE.md, /dp]
---

# Outcome

Selecting Google or any other credential-backed Provider immediately exposes the fields needed to configure it instead of presenting a second hidden Configure now step.

# Scope

- Treat an untouched editor state as open for every selected Provider, whether its readiness comes from project-local values, the shared profile or remains missing.
- Preserve Configure later as an explicit per-Provider collapsed state.
- Keep configured values write-only: show their source summary and leave-blank-to-keep placeholders without returning stored values.
- Apply the same behavior to social login, email, billing, S3, Turnstile, push, SMS, Stream and release-platform credentials through the shared editor.

# Verification

- Typecheck and build the Web application.
- Run Setup browser acceptance and confirm selected missing Providers render their credential labels, setup links and test actions while configured Providers never expose stored values.
- Run knowledge, Agent Map and Change Spec checks.

# Release

Local implementation only. Development requires a new verified Engine publication; Stable and Production remain unchanged.
