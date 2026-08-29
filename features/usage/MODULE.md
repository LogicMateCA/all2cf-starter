---
module: usage
status: local-verified
source: starter
---

# Usage module

Purpose: meter completed server-side product work against a verified entitlement without letting clients invent usage, owners, periods, or quotas.

- `saas.usage` is independently materialized and requires `saas.entitlements`, which in turn requires Stripe Billing. Invalid dependency chains fail before mutation.
- Product Worker routes call the server-only `consumeUserUsage()` helper at their authoritative boundary. Standalone Usage exposes no public consume endpoint. When `saas.api-platform` is selected, `/api/v1/me` becomes one reviewed public caller: it derives the user from a verified Better Auth API key before passing the fixed meter, amount and idempotency key. The helper never accepts a client-owned user ID.
- PostgreSQL calculates the UTC monthly period. One transaction-level advisory lock serializes each user/metric/period even before a bucket row exists. The same transaction resolves the current entitlement, detects idempotent replay or conflict, checks quota, inserts an immutable event, and increments its bucket.
- Missing or disabled entitlements and exceeded quotas roll back without creating an event, idempotency receipt, or empty bucket. A same-key/same-amount replay returns the original event without incrementing; a same-key/different-amount request is rejected.
- `/api/usage/me` derives its subject from the Better Auth session. `/api/admin/usage/:userId` is platform-Admin read-only. Neither surface can consume, correct, or delete usage.
- The generic `product.actions.monthly` meter is scaffolding. A copied product must replace the vocabulary, call the helper only from successful server actions, and prove its own allow/deny semantics before Development release.
- The API Platform contributes a separate `api.requests` proof meter with 1,000 Free and 100,000 Pro monthly units. It demonstrates composition and must also be replaced when the copied product's API contract differs.
- Credits, wallet balances, Stripe provider-side metering, organization usage, manual corrections, exports, and asynchronous analytics are separate product decisions.

Selected-state local evidence uses a disposable empty PostgreSQL database and real workerd. It proves anonymous/invalid/Free denial, absence of rejected writes, session ownership, concurrent same-key replay, concurrent distinct-key quota enforcement, exact event/bucket totals, readback, and platform Admin read-only access. The full selected dependency chain also passes Web/Worker types, all builds, bundle budgets and Development/Production Wrangler dry-runs. Deselecting Usage, Entitlements and Stripe removes only receipt-owned files and dependencies; the default empty-database smoke and complete verification suite then pass without them.
