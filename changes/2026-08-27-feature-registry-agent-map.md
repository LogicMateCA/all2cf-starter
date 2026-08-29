---
id: feature-registry-agent-map
title: Keep customer and adopted functionality represented in Agent Map
status: implemented
affectedModules: [assembler]
docsImpact: [PROJECT.md, AGENT_MAP.md, /dp]
---

# Outcome

Generated projects now retain `.ai/features.json` as the source of product-added and adopted functional domains. `feature:add` registers a new domain or attaches it to an existing Agent Map route, `feature:sync` deterministically updates machine and human maps, and `feature:coverage` blocks unregistered feature directories or stale maps. Small changes remain inside an existing domain instead of expanding Agent Map.

`feature:adopt` scans conventional feature roots in an older project and writes review-only candidates. It never infers ownership and bulk-applies code automatically. The `feature-lifecycle` Skill routes AI through review, registration, Change Spec, knowledge synchronization and verification.

# Verification

- Isolated new-domain creation generated the feature registry entry, module document, machine route and human route, then passed coverage.
- Isolated old-project scanning found an Inventory feature and produced a review-only adoption candidate.
- Agent Map contract includes feature coverage.
- Factory contract proved generated Web SaaS projects retain the registry, script, Skill and all four commands.
- Skill validation passed.

# Release

Canonical Starter source only. A new Engine publication is required before hosted All2CF projects receive this capability.
