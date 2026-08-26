---
id: generated-saas-integrity
title: Make generated Web SaaS packages independent and identity-safe
status: implemented
affectedModules: [assembler, product-shell, mobile]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, AGENT_MAP.md, /dp]
---

# Outcome

Factory now completes identity synchronization, product-shape pruning, dependency-lock refresh, Worker type generation and project knowledge generation in delivery order. A generated Web SaaS defaults to Marketing, Docs, Web and Worker API; Mobile is included only when a mobile platform is selected. Generated Worker, route, Queue, R2, package, Docs and visible Web identities use the new project rather than canonical Starter values.

Generated projects begin Change Spec enforcement at their independent Git root. Factory controllers, Factory drafts, source-release Skills and source-only product-shape scripts are absent from customer output. Agent Map, module inventory, commands, lockfile and `/dp` follow the selected product shape. A detached linked-source archive can report installed Packs and an unavailable update source without mounting the canonical repository.

Portable receipts with `sourceRoot=null` remain generated-product Setup mode and cannot expose canonical `/factory`. Setup browser acceptance selects `/factory` only in the source repository and `/setup` in generated products. The report may omit an Artifact hash before a production build. On mobile, the seven readable Setup steps use a horizontally scrollable rail instead of overlapping under the global typography floor.

# Verification

- Factory contract covers local and portable generation, identity isolation, source-controller pruning, independent Change Spec baseline, optional Mobile output, detached status and receipt-owned conflict refusal.
- A disposable Web SaaS installs 793 packages with zero production vulnerabilities, passes its complete `verify`, builds Marketing/Web/Docs, satisfies bundle budgets and completes Development and Production Worker dry-runs with project-specific resources.
- Local linked-source and All2CF-style portable packages both pass `/setup` browser acceptance at desktop/mobile and light/dark modes with eight screenshots each.
- The portable package typechecks without a canonical source root and remains in `/setup` mode.

# Release

Source-only. No Development, Production, Stable Channel or All2CF deployment is part of this change.
