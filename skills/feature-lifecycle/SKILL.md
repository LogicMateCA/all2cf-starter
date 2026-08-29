---
name: feature-lifecycle
description: Register, adopt, synchronize, or validate product functionality in a Starter-generated project's feature registry and Agent Map. Use when adding a new business domain, merging functionality from an older project, or checking that AI context covers new feature code.
---

# Feature lifecycle

Treat `.ai/features.json` as the source for product-added and adopted functionality. Agent Map is the high-level generated router, not a list of every page or API.

Before adding functionality, decide whether it belongs to an existing Agent Map route:

- Add a small capability to an existing route when it shares ownership, primary code, documentation, and checks.
- Create a new feature domain only when it has an independent business responsibility and will be worked on separately.

Use `npm run feature:add -- --id <id> --summary <summary> --files <paths>` to register a new domain. Pass `--route <existing-route>` to attach it to an existing domain. Then implement the feature, update its generated `features/<id>/MODULE.md`, add one focused Change Spec, and run `feature:sync` plus `feature:coverage`.

For a whole older project that has not adopted Starter contracts, use `skills/project-adoption/SKILL.md` first. After its infrastructure bootstrap, review `.ai/feature-adoption-candidates.json`; never bulk-apply inferred ownership. Register each accepted candidate through `feature:add`, then move or map its real paths without rewriting its business behavior merely to fit Starter conventions. Use `npm run feature:adopt -- --root <path>` directly only when the target already has the Starter registry and needs another candidate scan.

The work is incomplete if a new feature directory has no registry owner, Agent Map is stale, or `/dp` knowledge has not been regenerated. Finish with `knowledge:sync`, `knowledge:check`, `agent-map:check`, `feature:coverage`, and risk-proportional product tests.
