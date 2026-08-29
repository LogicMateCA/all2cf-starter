---
module: onboarding
status: local-verified
source: starter
---

# Product onboarding module

Purpose: give copied products one resumable, server-authoritative first-login flow without pretending that every SaaS has the same setup questions.

- `saas.onboarding` is optional and begins with one neutral acknowledgement step. A copied product replaces `productOnboarding` with its real first-success steps and increments the definition version.
- The Worker is the definition authority. The Web page renders the returned ordered steps; clients cannot invent a step, user, version, completion timestamp, or order.
- Progress is user-scoped PostgreSQL state. Completion is serialized per user, idempotent, resumable across sessions, and intersects old progress with the current definition when the product changes.
- When selected, Product Shell checks status on authenticated `/app` navigation and redirects incomplete accounts to `/app/onboarding` with a bounded return path. Admin receives aggregate read-only counts, never another user's step mutation.
- The generic step is scaffolding rather than product acceptance. Development release requires a copied product to define the real first-success journey and verify it in a browser.

The selected-pack disposable empty-database workerd smoke proves anonymous denial, authoritative step order, invalid-step rejection, idempotent completion, persisted resume state, session ownership, and platform Admin aggregates. The selected full gate proves route generation, Web and Worker types, builds, bundle budgets, and both Cloudflare dry-runs. A deselect plan and apply then removed only receipt-owned files and the default workerd regression passed. Browser redirect acceptance, copied-product steps, and Development release remain open.
