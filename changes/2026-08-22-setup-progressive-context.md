---
id: setup-progressive-context
title: Keep Setup focused and load only selectable StyleKit context
status: implemented
affectedModules: [assembler]
docsImpact: [features/assembler/MODULE.md, PERFORMANCE.md, /dp]
---

# Outcome

Routine Setup no longer sends all 146 StyleKit source entries or expands the complete Provider ledger below the real configuration controls. The user sees the 28 eligible global systems and can open the full Provider reference only when needed.

# Scope

- Filter Setup's StyleKit response to the 28 `base-visual` / `global-system` entries that can actually own the project style lock.
- Keep full source classification on the server for Blueprint validation and in `/dp` for audit/AI use.
- Collapse the 17-category Provider ledger into an explicit Advanced reference while leaving executable configuration and tests visible.
- Give external Provider calls a bounded timeout and run EAS/identity/DP child processes asynchronously so local Setup remains responsive.
- Write Provider secrets atomically inside the same rollback boundary as Blueprint/config identity synchronization.

# Verification

- Setup response fell from 674,633 bytes to 382,261 bytes (43.3% smaller) while retaining all 28 selectable global systems, 28 snapshot summaries and all 17 Provider categories.
- Web/Worker/Mobile/Astro type checks pass. Local Setup browser acceptance passes four desktop/mobile, light/dark cases with eight screenshots and zero failures.
- The visual browser matrix exercises the Design selector; a dedicated save/reload mutation assertion remains separate from this response-size change.

# Release

No release yet. Development and Production remain unchanged.
