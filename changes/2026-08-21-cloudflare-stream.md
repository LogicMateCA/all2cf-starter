---
id: cloudflare-stream
title: Add optional Cloudflare Stream video lifecycle
status: implemented
affectedModules: [assembler, media, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/media/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select Cloudflare Stream for user-owned one-time video uploads, processing state, public playback URLs, signed webhook updates and owner-scoped deletion without exposing the Stream API token to clients.

# Scope

- Add separate environment account/API/origin configuration, Stream token and webhook secret plus a bounded maximum duration.
- Add verified-user direct upload creation, five-per-hour limit, owner-only list/delete and public playback HLS/DASH state.
- Verify Stream webhooks with timestamp-bounded HMAC-SHA256, constant-time comparison and replay-safe signature ledger before updating an asset.
- Add Setup direct-upload draft/create/delete token test and read-only Admin health evidence.
- Deliberately keep `requireSignedURLs=false`; private playback cannot be selected until signing-token generation is executable.

# Verification

- Selected-pack Workerd evidence proves anonymous denial, exact bearer/API request contract, owner-bound upload identity, signed ready webhook, invalid-signature denial, replay idempotency, playback state and provider-backed deletion.
- Selected types and both Worker dry-runs pass; deselection removes Worker/SQL files, secret requirements and variables, then default regression passes.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after Stream controls were added.
- A real Stream token test action exists, but no live video upload/encoding/playback/webhook evidence was available. The Pack remains `implemented`, not `local-verified`.

# Release

No Worker release. The current Blueprint leaves Stream unselected. Development acceptance requires a real upload, encoding completion, signed webhook and playback check; Production remains unchanged.
