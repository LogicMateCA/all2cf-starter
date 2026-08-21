# API platform pack

This is the explicit full API-SaaS composition. It requires Better Auth API keys, Stripe-backed entitlements, usage metering, and outgoing webhooks instead of duplicating those systems.

The initial `/api/v1/me` endpoint proves the complete reusable boundary: hashed user-owned API key authentication, required read scope, no session impersonation, request idempotency, quota enforcement, owner-isolated data, persisted usage evidence, and an optional signed `api.request.completed` outgoing event.

Copied products replace the example read model and permission vocabulary with their real resources. They keep the authentication, metering, event, documentation, and operational contracts.
