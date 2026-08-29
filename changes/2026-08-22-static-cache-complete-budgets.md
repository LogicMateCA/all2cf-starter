---
id: static-cache-complete-budgets
title: Cache hashed assets immutably and close bundle-budget blind spots
status: implemented
affectedModules: [marketing, product-shell, docs, operations]
docsImpact: [PERFORMANCE.md, features/marketing/MODULE.md, features/docs/MODULE.md, features/operations/MODULE.md, /dp]
---

# Outcome

Repeat visits can reuse content-hashed Web/Marketing/Docs assets without an edge revalidation, and release budgets cover shared CSS plus Setup, Account, Product Shell, Admin and every unreviewed Web chunk rather than a small filename allowlist.

# Scope

- Add Cloudflare Static Assets `_headers` rules for hashed `/_app/assets`, `/_marketing` and `/_docs` outputs.
- Deliberately exclude mutable `/dp` and `/pagefind` paths from immutable caching.
- Add focused gzip budgets for route chunks and shared CSS, plus a 50KB catch-all ceiling for any unreviewed Web chunk.
- Verify the merged artifact contains the exact reviewed cache contract.

# Verification

- Production builds, the merged cache contract, Marketing/Web/Docs bundle budgets and both Wrangler configuration dry-runs pass.
- Live header readback remains pending until a later Development release; this change does not publish.

# Release

No release yet. Development and Production remain unchanged.
