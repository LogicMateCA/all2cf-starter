---
id: cloudflare-images
title: Add optional Cloudflare Images optimization
status: local-verified
affectedModules: [assembler, media, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/media/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select Cloudflare Images for bounded raw-byte resize/transcode operations while retaining Object Storage as the original-file authority and carrying no Images Binding when unselected.

# Scope

- Add image Provider, maximum input and default output format to the Blueprint.
- Add a receipt-owned Worker helper and platform-Admin fixed-image test with width/height and format bounds.
- Generate the `IMAGES` Binding and policy variables only while selected; never create a public arbitrary-origin transformation proxy.
- Add Setup explanations, official links and a Development Admin test boundary.
- Report Binding/policy readiness in Admin health without transforming an image.

# Verification

- Selected Workerd evidence proves ordinary-user Admin denial and a real local Images Binding transformation from a decoded 2×2 RGB PNG to 1×1 WebP.
- The first embedded PNG exposed an invalid libpng fixture and was replaced only after `sharp` decoded the new RGB fixture successfully; the same Miniflare Images transform then passed.
- Selected Worker types and both environment dry-runs include `IMAGES`; deselect/apply removes the Worker feature, Binding and variables, then the default regression passes.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after image controls were added.
- The local low-fidelity Binding is verified. A deployed high-fidelity Development transform and cache behavior remain required for Development verification.

# Release

No Worker release. The current Blueprint leaves Images unselected. Production is unchanged.
