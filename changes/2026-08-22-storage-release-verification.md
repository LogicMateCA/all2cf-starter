---
id: storage-release-verification
title: Verify selected storage through the released binding
status: development-verified
affectedModules: [storage, assembler, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/storage/MODULE.md, features/assembler/MODULE.md, starter.manifest.json, /dp]
---

# Outcome

Every Web/Worker release with a selected Object Storage Provider performs an authenticated server-to-provider exact-byte put/get/delete round trip after deployment and records the exact selected Cloudflare resource identity in the environment-scoped Starter state.

# Scope

- Add a fixed release-only storage verification endpoint protected by an HMAC derived from the environment's existing Better Auth secret.
- Write, read, compare and delete one generated object through the selected runtime adapter. Never touch product object keys or metadata rows.
- Require Provider, bucket, byte-count and cleanup evidence before the release is accepted.
- After Wrangler deployment, reconcile and record selected R2, Vectorize and Queue identities so resources automatically provisioned by Wrangler cannot escape the Starter resource ledger.

# Verification

- Disposable empty-database Workerd passed missing-proof denial plus a valid release-proof exact-byte put/get/delete round trip, followed by the existing authenticated private/public object lifecycle regression.
- Development release commit `1f68bd854d30e5087f6efc331a713787e00a7edd` passed the live `cloudflare-r2` / `starter-dev-objects` exact 77-byte put/get/delete check with cleanup, while the controller recorded the exact R2 and Queue identities.
- The prior Development release exposed that Wrangler may auto-provision a missing R2 bucket; the pre-fix local state did not record that bucket, so the release could not yet satisfy the resource-ownership contract.
- The first revised deployment uploaded successfully and recorded the exact R2/Queue identities, but the immediate custom-domain request still reached the prior version and correctly failed the new route check. Verification now retries the full expected storage identity/round-trip result during edge propagation rather than retrying HTTP status alone.
- Cloudflare MCP and Worker Studio MCP were unavailable. Wrangler output plus official Cloudflare API readback remain the evidence sources.

# Release

Development deployment `78846fb8-b184-46b1-bdc2-764e4ab44e42` / version `76ad98cf-bf82-459c-8ad8-b1a5271f7cc8` serves 100% of `starter-dev` traffic. Artifact SHA-256 is `87572b6473cc94ea6ffb5902edae324eb2070ef9c6c437dad3ce6301ddc17492`. Production remains unchanged.
