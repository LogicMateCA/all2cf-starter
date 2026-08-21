---
module: webhooks
status: local-verified
source: starter
---

# Outgoing webhooks module

Purpose: deliver signed product events outside the request path with bounded retries and inspectable evidence.

- `saas.outgoing-webhooks` is optional. It owns endpoint management, a PostgreSQL event/delivery ledger, one Cloudflare Queue producer/consumer binding per environment, user delivery history, and platform-Admin readback.
- Product Worker code calls `enqueueOutgoingWebhook()` inside its own PostgreSQL transaction. The helper inserts the event and delivery rows, awaits the Queue write, and lets the caller commit only after the Queue accepts the messages. A consumer briefly retries a not-yet-visible row to cover the queue-before-commit race; an orphan message is harmless.
- Queue processing is at least once. The delivery row and stable delivery ID make retries idempotent. HTTP 2xx succeeds; other responses and network failures retry with bounded delay, then become terminal evidence after five attempts.
- Each endpoint secret is derived from the Worker-only `WEBHOOK_SIGNING_KEY`, endpoint ID, and secret version. It is shown only on create or rotate and is never stored in PostgreSQL. Rotation increments the version and invalidates the old secret.
- Requests use HTTPS only, reject credentials and obvious local/private destinations, cap endpoints/events/payloads, send a fixed JSON envelope, and sign `delivery-id.timestamp.body` with HMAC-SHA256.
- The generic `starter.webhook.test` event is scaffolding. When API Platform is selected, a newly metered API request also emits the owned `api.request.completed` event; an idempotent replay does not emit again. A copied product must define its remaining event vocabulary and call the helper only after authoritative business state has been written.

Development requires a real Development Queue and a Development-only signing root. Production uses a separate Queue and signing root. Materialization declares both queue bindings and secret requirements but never stores secret values.

Selected-state local evidence uses a disposable empty PostgreSQL database and real workerd Queue simulation. It proves anonymous denial, user-owned endpoint lifecycle, one-time secret disclosure, exact HMAC envelope verification, 2xx success, non-2xx retry then success, five-attempt terminal failure, rotation, archive, and platform-Admin readback. Both selected and default states pass full types, builds, budgets, Development/Production Wrangler dry-runs, and default auth/email/Admin regression; deselection removes only receipt-owned files, Queue declarations, and secret requirements.
