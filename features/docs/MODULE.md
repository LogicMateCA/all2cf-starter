---
module: docs
status: template
source: starter
---

# Docs module

Purpose: own public Astro Starlight documentation, generated references, internal Markdown contracts, and the read-only `/dp` Development Plan.

- Audience: product users, operators, project owners, and AI controllers.
- Canonical source: Markdown with frontmatter
- `/dp` output: generated from the Markdown source
- Freshness owner: Sol controller through a focused Change Spec, affected canonical Markdown updates, `knowledge:sync`, and `knowledge:check` in every material change.

No material implementation is complete while `/dp` is stale. Generated output must never silently replace the Markdown/frontmatter source; after a release, live `/dp` must report the exact released commit and Change Spec.
