---
id: maintenance-update-clarity
title: Make Starter updates understandable before applying
status: verified
affectedModules: [assembler]
docsImpact: [apps/docs/src/content/docs/docs/guides/all2cf-connection.md]
---

# Outcome

Local `/maintenance` now presents one action bar for check, diff, update,
All2CF project, release details and disconnect. Version comparison is followed
by installed component versions and then the exact Base/Local/Target plan:
managed changes Starter may apply, customer changes it will preserve, and
conflicts that block automatic application.

Raw JSON is hidden under Advanced diagnostics without an internal scroll box.
The Update action remains disabled until a diff has been reviewed and remains
disabled while conflicts exist. Catalog-only components are versioned but stay
unloaded.

# Verification

- Stable Channel exposes all 28 Pack versions; the proof project reports 11
  installed and 17 Catalog-only components.
- Desktop and mobile browser proofs verify the unified action order, contained
  button labels, component matrix, three-way change groups, collapsed raw
  diagnostics and zero horizontal overflow.
- The proof project reports three customer UI files as preserved rather than
  overwriting them.

