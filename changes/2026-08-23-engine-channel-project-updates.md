---
id: engine-channel-project-updates
title: Add Engine channels and generated-project updates
status: local-verified
affectedModules: [assembler, operations, docs]
docsImpact: [PROJECT.md, ALL2CF_FACTORY.md, features/assembler/MODULE.md, skills/starter-source-release/SKILL.md, skills/starter-maintenance/SKILL.md, /dp]
---

# Outcome

Canonical Starter updates publish an immutable Engine candidate into a monotonic update Channel. Factory-generated products can inspect that Channel, verify and unpack its exact Engine artifact, preview materialization changes, add Packs and apply updates without carrying the reusable source library.

# Safety

- Channel publication retains old versioned artifacts and refuses downgrade or same-version hash replacement.
- Remote maintenance accepts only an HTTPS Channel, with loopback HTTP allowed for local verification.
- Engine downloads are size-bounded, SHA-256 verified and rejected for unsafe tar paths.
- Product-modified receipt-owned files remain conflict protected by materialization hashes.
- Source receipts advance only after successful Pack materialization.

# Verification

The portable Engine Channel contract creates a generated product, serves a real Engine archive, reports `dev.9 -> dev.10`, produces a zero-write diff, adds the 2FA Pack, applies an idempotent update and refuses a product-modified receipt-owned file. Full type checks, Factory, knowledge, Agent Map and Change Spec contracts pass.

Clean-source `dev.10` first proved the immutable candidate and exposed the new Channel evidence directory as unignored source dirt. That immutable Artifact remains retained. Clean `dev.11` then passed canonical verification, SQL-first and Drizzle portable generation, two-build reproducibility and strict candidate checks; the `development` Channel advanced monotonically from `dev.10` to `dev.11` while `source:status` remained clean. The final documentation-aligned source commit is published as the next immutable development Engine rather than rewriting either retained Artifact.

# Release

Local implementation only. No All2CF, Cloudflare, Development or Production deployment is authorized.
