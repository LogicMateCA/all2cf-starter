---
id: provider-owned-storage-maps
title: Move storage and maps out of Product Features
status: development-verified
affectedModules: [assembler, storage]
docsImpact: [PROJECT.md, features/assembler/MODULE.md]
---

# Outcome

Product Features is one bounded grid containing only non-Provider capabilities. Object Storage and Maps no longer appear there, preventing duplicate selection state.

Object Storage remains exclusively controlled by its existing None, Cloudflare R2 and S3-compatible Provider. Maps becomes an exclusive Provider choice: None selects no Pack, while MapCN + MapLibre selects `capability.mapcn-web`. Google Maps and Mapbox are visible planned choices but remain disabled until their adapters, credentials, Setup tests and safe removal contracts are implemented. MapTiler stays in the canonical Provider ledger but is not promoted into the primary Factory choice set.

# Verification

- `npm run factory:ux:contract`
- `npm run providers:contract`
- `npm run typecheck`
- `npm run factory:contract`
- `npm run knowledge:sync && npm run knowledge:check`

# Release

This source change requires a new immutable Engine candidate and a separate All2CF Core integration. It does not itself authorize deployment.
