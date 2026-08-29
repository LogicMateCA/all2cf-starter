---
id: cloudflare-durable-objects-realtime
title: Add optional Durable Objects realtime rooms
status: local-verified
affectedModules: [assembler, background, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/background/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select an authenticated realtime-room foundation backed by one SQLite Durable Object per room and Cloudflare's hibernatable WebSocket server API.

# Scope

- Materialize the room class, authenticated Worker route, fixed Admin round-trip, `STARTER_REALTIME` Binding, declarative SQLite class export and readiness variables only while selected.
- Bound room IDs to 64 safe characters and messages to 1000 characters. Persist the monotonic sequence and last accepted message inside the Durable Object.
- Use Better Auth before proxying a socket request and retain user identity in the WebSocket attachment so it survives object hibernation.
- Deselecting removes access, Binding and generated code but never emits a destructive Durable Object namespace tombstone. Any later data deletion is a copied-product decision requiring explicit authority.

# Verification

- A disposable selected materialization passed Worker/Web/Mobile/Astro types and both environment Wrangler dry-runs with `STARTER_REALTIME (StarterRealtimeRoom)` plus declarative SQLite storage.
- Disposable empty-database Workerd evidence proved ordinary-user Admin denial, a real hibernatable-WebSocket ready/send/broadcast cycle, authenticated user attribution, sequence `1` and matching persisted last-message state.
- Deselect/apply removed the receipt-owned feature, Binding, variables and generated class export. Regenerated types contained no Durable Object runtime, materialization check passed, and the default auth/health regression reported the capability truthfully unselected.
- Setup browser acceptance passed all 4 cases with 8 screenshots and artifact SHA `00f32034dc77c655eda67133b9514def58d9f3ac949eeba283d35786b42d7ea7`.
- Cloudflare MCP and Worker Studio MCP tools were unavailable in this session. Current official Durable Objects lifecycle, declarative exports and WebSocket Hibernation documentation were used instead.

# Release

No Worker release. Current Blueprint leaves realtime unselected. Development must verify the deployed socket and a selected-to-deselected release before this capability can become Development-verified; Production remains unchanged.
