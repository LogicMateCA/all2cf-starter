---
id: public-capability-reference
title: Publish the exact page Pack and Provider inventory
status: development-verified
affectedModules: [assembler, docs]
docsImpact: [README.md, CAPABILITIES.md, apps/docs/src/content/docs/docs/reference/capabilities.md]
---

# Outcome

The public README now gives an immediate product inventory instead of only architecture claims. `CAPABILITIES.md` records permanent SaaS foundations, all nineteen page routes, optional SaaS Packs and every Provider family while distinguishing selectable implementations from planned disabled options. Starlight exposes a compact reader-facing reference page and links to the complete repository table.

# Verification

- Docs typecheck and static build pass.
- Every listed page and Provider maps to the current machine-readable Catalog.
- Planned options are explicitly disabled and are not represented as available runtime.

# Release

This is public documentation only. It does not change Engine materialization, Provider selection or deployed product behavior.
