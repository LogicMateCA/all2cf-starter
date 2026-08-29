---
module: operations
status: local-verified
source: starter
---

# Operations health module

Purpose: give platform operators a truthful, bounded view of runtime readiness without turning the Starter into a monitoring product.

- Release checks verify immutable cache rules in the merged artifact and complete route/CSS chunk budgets before upload.
- Recent notification and audit counts use created-time indexes; rate-limit queries use their actor/time indexes before the baseline is considered growth-ready.

- Public `/api/health` is a dependency-free Worker liveness endpoint. It does not claim PostgreSQL or provider health.
- Platform Admin `/api/admin/health` actively checks PostgreSQL through the selected native-Hyperdrive or CFPG runtime and reports query latency. It never exposes secrets.
- Authentication email, selected social sign-in providers and optional Turnstile report configuration completeness. Email adds bounded 24-hour outbox evidence and last success/failure timestamps; Turnstile health remains read-only and never generates a challenge.
- Stripe and outgoing-webhook Queue appear only when their optional pack/runtime evidence exists. Their status combines configuration with persisted webhook/delivery records; an unselected capability reports `not-selected`.
- Workers AI appears only when selected and reports Binding, model and Gateway configuration without making an inference request; the explicit Admin test route owns real deployed verification.
- Product search reports `not-selected`, PostgreSQL, or Vectorize Binding/index readiness without running a query; explicit Setup/Admin tests own real Vectorize traffic.
- Expo Push reports project/access-token configuration, registry readiness, active device count and bounded ticket failures without sending a notification from the health dashboard.
- Twilio SMS reports API-key/sender configuration, idempotency-ledger readiness, accepted/error counts and last provider SID without exposing recipients or sending from health.
- Cloudflare Images reports Binding, input ceiling and default output-format readiness without performing a billable transform from health.
- Cloudflare Stream reports API/webhook configuration and pending/ready/error asset counts without creating uploads or playback traffic from health.
- Cloudflare Cron reports configured expression, heartbeat-ledger readiness, run count and last run without invoking the scheduled handler from health.
- Cloudflare Workflows reports Binding/resource readiness without creating an instance from health.
- Durable Objects realtime reports Binding/class/storage readiness without opening a socket or waking a room from health.
- The dashboard is read-only and lazy. It never sends test email, creates provider resources, or enqueues synthetic events.

Disposable empty-database workerd verification proves anonymous and ordinary-user denial, platform Admin readback, active database latency, configured authentication email, exact selected/unselected Google/GitHub/Apple state, real authentication-email delivery counts, and truthful unselected optional providers. Separate Stripe-only and Outgoing-Webhook-only flows prove webhook-ledger and real local Queue binding/delivery evidence. Web and Worker type checks pass. Remote provider reachability, browser accessibility, alert routing, retention, external observability, and Development release remain open.
