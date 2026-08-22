---
id: twilio-sms
title: Add optional Twilio SMS delivery
status: implemented
affectedModules: [assembler, notifications, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/notifications/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select Twilio SMS and receive a server-only, API-key-authenticated, idempotent delivery adapter with environment credentials, Setup/Admin test actions and privacy-bounded evidence.

# Scope

- Use separate Development/Production Account SID, API Key SID, API Secret, E.164 sender and regional API base URL.
- Add a Worker helper that reserves a unique SQL idempotency key before contacting Twilio, validates bounded E.164/body/kind inputs and records provider SID/status/error without storing the SMS body or full recipient.
- Add a platform-Admin-only fixed-message test route and local Setup real-delivery action.
- Add Admin health evidence for configuration, ledger readiness, accepted/error counts and last provider SID without sending traffic.
- Keep SMS independent from Better Auth second factor, Expo Push, authentication email and in-app notifications.

# Verification

- Selected-pack disposable Workerd evidence proves ordinary-user Admin denial, exact HTTP Basic API-key authentication, form-encoded To/From/Body, one provider request across an idempotent replay, recipient hashing/last-four storage and provider SID/status evidence.
- Selected Worker types and both environment dry-runs pass; deselection removes Worker/SQL files, secrets, variables and receipt ownership, then the default regression passes.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after SMS controls were added.
- A real Twilio test action exists in Setup, but no live Twilio credential/phone delivery or delivery-status callback evidence was available. The Provider therefore remains `implemented`, not `local-verified`.

# Release

No Worker release. The current Blueprint leaves SMS unselected. Development acceptance requires a real Twilio SID plus carrier delivery/status evidence; Production also requires reviewed messaging compliance and separate credentials.
