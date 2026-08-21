---
id: outgoing-webhooks
title: Add reliable signed outgoing webhooks
status: complete
affectedModules: [assembler, webhooks, admin, docs]
docsImpact:
  [
    PROJECT.md,
    ARCHITECTURE.md,
    PERFORMANCE.md,
    features/assembler/MODULE.md,
    features/webhooks/MODULE.md,
    features/admin/MODULE.md,
    catalog/catalog.json,
    catalog/saas-capabilities.json,
    starter.blueprint.json,
    /setup,
    /dp,
  ]
---

# Outcome

Copied products may select signed outgoing webhooks with endpoint lifecycle, bounded Cloudflare Queue retries, and user/Admin delivery evidence without enabling API keys, Usage, or a multi-step Workflow.

# Decisions

- Use one environment-owned Cloudflare Queue as both producer and consumer for single-step HTTP delivery. PostgreSQL remains the event, delivery, idempotency, and UI authority.
- Require product code to enqueue inside its authoritative SQL transaction and await durable Queue acceptance before commit. Retry a briefly missing delivery row to cover the queue-before-commit visibility race.
- Derive endpoint secrets from a Worker-only root and endpoint version. Disclose only on create/rotate; store no endpoint secret or root in PostgreSQL, config, receipt, or source.
- Sign a fixed bounded JSON envelope with HMAC-SHA256. Accept HTTPS destinations only and reject credentials plus obvious loopback/private targets.
- Keep this pack independent from Better Auth API Keys and Usage. Keep multi-step Workflows, inbound webhooks, organization ownership, custom transforms, replay-to-new-endpoint, and analytics as product decisions.
- Extend the materializer contract to own pack-declared Queue bindings, Queue consumers, secret requirements, and Worker queue-event registries in both environments, with receipt-backed removal and drift refusal.

# Verification

- Prove manifest/schema contracts, select/apply/check, generated Development and Production Queue names, secret requirements, Worker types, Web/Docs/Marketing builds, budgets, and Wrangler dry-runs.
- Use a disposable empty PostgreSQL database and local workerd Queue to prove session ownership, one-time secret disclosure, signed 2xx success, non-2xx retry then success, terminal failure, endpoint isolation, rotation, soft archive, and platform-Admin readback.
- Deselect and prove complete receipt-owned removal plus the default regression suite.
- Synchronize canonical Markdown, Change Specs, and `/dp`.

# Release

No deployment is authorized. Development acceptance still requires the copied product's event vocabulary, real product-transaction integration, Development Queue, Development signing root, and remote receiver evidence. Production remains separately authorized.
