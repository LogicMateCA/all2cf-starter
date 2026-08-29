---
id: executable-catalog-contract
title: Make every selectable Starter configuration executable
status: local-verified
affectedModules: [assembler, auth]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, catalog/catalog.json, starter.blueprint.json, dependency-policy.json, /setup, /dp]
---

# Outcome

The Catalog distinguishes permanent baseline capability, receipt-backed materializer packs, and visible but unavailable planned work. `/setup`, direct Blueprint edits, and the materializer reject a planned selection, so AI cannot save a configuration that has no implementation path.

# Decisions

- Executable presets contain only baseline or materializer-backed packs. The unfinished API Platform remains visible as a planned SaaS pack, but it is not a preset and cannot be selected until its owned implementation, SQL baseline, and verification flow exist.
- Google remains the only selectable social provider because it is the only provider currently implemented by the Worker, Web, Mobile, secret contract, and login flow. GitHub or Apple may return only through a later owned adapter Change Spec.
- Every materializer-delivered Catalog pack must have exactly one `packs/**/pack.json`; baseline and planned packs must not masquerade as materializer packs.
- Better Auth core, Expo, optional Stripe dependencies, and official-plugin source revisions are checked offline as one exact stable version. The offline contract runs in every repository verification; the online dependency report additionally compares all baseline and optional-pack declarations with registry stable tags.
- Database assembly remains a new-empty-database operation. This contract adds no migration, backfill, dual write, or database mutation.

# Verification

- The default Blueprint passes the assembly and materialization drift contracts.
- A temporary selected `saas.api-platform` Blueprint is rejected before any file, dependency, SQL, or receipt mutation.
- Removing a required materializer manifest is rejected as a Catalog delivery error.
- A temporary mismatched Better Auth optional-pack version is rejected by the offline dependency contract; the restored aligned 1.7.1 family passes.
- `/setup` typecheck and production build pass with planned packs disabled and Google as the only selectable social provider.
- `knowledge:sync`, `knowledge:check`, and the full repository verification pass without contacting or changing either PostgreSQL database.

# Release

No deployment or database operation is authorized by this change. Development and Production release evidence remain unchanged.
