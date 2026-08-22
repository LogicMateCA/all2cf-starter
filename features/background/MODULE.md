---
module: background
status: local-verified
source: starter
---

# Background and realtime module

Purpose: make asynchronous, scheduled, durable and realtime infrastructure explicit rather than adding every Cloudflare product to every copied Worker.

- Cloudflare Queues is already executable through the Outgoing Webhooks Pack with at-least-once delivery and bounded retries.
- Optional Cron adds environment-specific UTC expressions and dispatches through the generated Worker event registry. Its generic job only records an idempotent heartbeat; copied products own their scheduled work and retry semantics.
- Deselecting Cron keeps `triggers.crons: []` in Wrangler so the next release removes remote triggers instead of leaving dashboard state behind.
- Workflows is locally verified as a fixed durable two-step skeleton with Admin create/status, optional binding schedules and exact-resource removal logic. Durable Objects remains Planned until class/migration/binding/WebSocket tests and removal are complete.

Local Workerd scheduled invocation proves exact cron/time dispatch and heartbeat evidence. Development trigger propagation, live event history and product job behavior remain release gates.
