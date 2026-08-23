---
id: engine-channel-project-updates
title: Add Engine channels and generated-project updates
status: implementing
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

Pending clean-source `2.0.0-dev.10` candidate, monotonic local Channel publication, portable SQL/Drizzle generation and real status/diff/add/update/conflict tests.

# Release

Local implementation only. No All2CF, Cloudflare, Development or Production deployment is authorized.
