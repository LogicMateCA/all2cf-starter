---
id: stable-saas-default-style
title: Fix Editorial as the reusable black-white SaaS style
status: implemented
affectedModules: [assembler, design, marketing, auth, product-shell, admin, docs, mobile]
docsImpact: [PROJECT.md, DESIGN.md, features/assembler/MODULE.md, starter.blueprint.json, /setup, /dp]
---

# Outcome

The Starter uses one calm, durable black/white SaaS visual foundation instead of retaining purple Glassmorphism, blue full-page surfaces, or encouraging routine theme switching.

# Scope

- Select and pin StyleKit `editorial@2.2.0` with snapshot hash `6c738963515a50730fd1b6313e5627bf8760a62f28dd8ccb4933278686cfd806`.
- Use `#fafafa` for the light canvas and `#0a0a0a` for the dark canvas; keep the restrained red accent limited to actions and state rather than page backgrounds.
- Materialize its owned Web, Marketing, Starlight and Expo adapters across the current project.
- Treat style choice as an initialization decision; ordinary Setup edits retain the existing style lock.
- Fix StyleKit selection so a changed card always marks the Blueprint dirty and exposes Save actions.
- Replace hard-coded white selected-step and selected-pack checkmarks with semantic `on-accent` contrast.

# Verification

- Confirm the materialization plan changes only selected StyleKit outputs and the receipt.
- Run StyleKit, design, typography, materialization, typecheck, build, bundle and knowledge contracts.
- Browser screenshot audit remains pending because the current browser capture target is unavailable; do not claim visual acceptance until the owner inspects the local result or capture access is restored.

# Release

Local implementation only. Development remains on the previously released Glassmorphism artifact until an explicit release.
