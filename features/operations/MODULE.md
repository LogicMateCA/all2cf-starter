---
module: operations
status: local-verified
source: starter
---

# Operations health module

Purpose: give platform operators a truthful, bounded view of runtime readiness without turning the Starter into a monitoring product.

- Public `/api/health` is a dependency-free Worker liveness endpoint. It does not claim PostgreSQL or provider health.
- Platform Admin `/api/admin/health` actively checks PostgreSQL through the selected native-Hyperdrive or CFPG runtime and reports query latency. It never exposes secrets.
- Authentication email, selected social sign-in providers and optional Turnstile report configuration completeness. Email adds bounded 24-hour outbox evidence and last success/failure timestamps; Turnstile health remains read-only and never generates a challenge.
- Stripe and outgoing-webhook Queue appear only when their optional pack/runtime evidence exists. Their status combines configuration with persisted webhook/delivery records; an unselected capability reports `not-selected`.
- The dashboard is read-only and lazy. It never sends test email, creates provider resources, or enqueues synthetic events.

Disposable empty-database workerd verification proves anonymous and ordinary-user denial, platform Admin readback, active database latency, configured CFsend and Google state, real authentication-email delivery counts, and truthful unselected optional providers. Separate Stripe-only and Outgoing-Webhook-only flows prove webhook-ledger and real local Queue binding/delivery evidence. Web and Worker type checks pass. Remote provider reachability, browser accessibility, alert routing, retention, external observability, and Development release remain open.
