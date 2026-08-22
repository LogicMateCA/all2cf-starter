---
id: object-storage-providers
title: Add selectable R2 and S3-compatible object storage
status: local-verified
affectedModules: [assembler, storage, support]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/storage/MODULE.md, features/support/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select no object storage, Cloudflare R2, or an S3-compatible service. Selection materializes only the required Worker adapter, API, Web route, SQL metadata, bindings, secrets and dependencies; R2 uses separate Development and Production buckets.

# Scope

- Add one receipt-owned Object Storage Pack with authenticated list/upload/download/delete APIs, optional public reads, owner-derived keys, a 10 MiB default Worker-upload limit, safe filename/content-type validation and PostgreSQL metadata.
- Generate provider-specific adapters: native `R2Bucket` for Cloudflare R2 and `@aws-sdk/client-s3` only when S3-compatible storage is selected.
- Add Setup controls for Provider, access policy, upload limit, isolated bucket names, public domains and S3 endpoint/region/path style plus write-only Development credentials.
- Reconcile selected R2 buckets only in the explicitly requested environment during provisioning; S3 secrets remain different in Development and Production.
- Keep Product Analytics unselected. Pulse is the preferred future external-product boundary; Starter does not duplicate Pulse by implementing another analytics runtime in this change.

# Verification

- `providers:contract`, materializer plan/apply/check, generated Development/Production Worker types and all workspace type checks pass.
- A disposable empty PostgreSQL database plus real Workerd local R2 simulation proves anonymous denial, private and public exact-byte upload/download, active-content rejection, deletion and soft-deleted metadata.
- The S3-compatible selection separately passes dependency installation/removal, adapter types and Development/Production Wrangler dry-runs. A real selected S3 endpoint still owes its explicit round-trip test before release.
- Official Cloudflare MCP and Worker Studio MCP were not callable in this session. Current Cloudflare R2 configuration, local-simulation and bucket API behavior were checked against current official Cloudflare documentation before implementation.

# Release

Local verification only. No Development or Production infrastructure was provisioned and neither Worker was deployed. A future Development release must provision the Development R2 bucket first and prove the deployed binding; Production remains explicit and must use its separate bucket.
