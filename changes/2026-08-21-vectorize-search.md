---
id: vectorize-search
title: Add selectable Cloudflare Vectorize search
status: local-verified
affectedModules: [assembler, search, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/search/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can keep product search absent, use PostgreSQL without another service, or select environment-isolated Cloudflare Vectorize indexes with real round-trip verification and receipt-owned bindings.

# Scope

- Add `providers.search` with `none`, baseline PostgreSQL and receipt-owned Vectorize choices.
- Record different Development/Production index names plus immutable dimensions and distance metric.
- Add a Vectorize Pack with an Admin-only generated-vector upsert/query/delete test and no client-authoritative vector API.
- Generate `VECTOR_INDEX` and exact search variables only while selected; reconcile the requested environment's index during scoped provisioning.
- Add Setup controls, explanations, official links and a real Development-index round-trip action.

# Verification

- A disposable live Vectorize index was created with 32 dimensions/cosine, received an upsert mutation, returned the exact test vector with score 1, accepted deletion and was deleted; live list read-back found no temporary indexes.
- Live API evidence corrected two stale/ambiguous documentation assumptions: current indexes require at least 32 dimensions and multipart upsert uses the `vectors` field.
- Selected-pack generated types and both Worker dry-runs showed the correct environment index Binding; all workspace types passed.
- Deselect/apply removed the Worker feature, Binding and variables; the default Workerd authentication/operations regression passed.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after the search controls were added.
- Official Cloudflare MCP and Worker Studio MCP were not callable in this session, so current official Cloudflare docs and live API behavior were used and the limitation is retained as evidence.

# Release

Local/provider verification only. The current Blueprint defaults product search to `none`; Development index provisioning and a deployed Binding test remain required for Development verification. Production is unchanged.
