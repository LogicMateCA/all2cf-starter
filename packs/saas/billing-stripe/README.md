# Stripe billing pack

This optional pack aligns `@better-auth/stripe` 1.7.1 with Better Auth 1.7.1 and Stripe SDK 22.5.0. It provides a Product Shell billing surface for verified-email Checkout, Customer Portal, cancellation review, scheduled-renewal restore and subscription history; signed webhook processing at `/api/auth/stripe/webhook` remains the only authority for the PostgreSQL subscription projection.

Stripe SDK 22.5.0 pins API `2026-07-29.dahlia`; the adapter uses Stripe's Fetch HTTP client for the Cloudflare Worker runtime.

The default scope is the authenticated user. Selecting the Organization pack does not silently change who pays; organization billing changes authorization, ownership, deletion, and seat semantics and must be chosen explicitly in the copied product.

Development uses Stripe Test credentials and Production uses Stripe Live credentials. The Worker fails closed when Stripe is selected without `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `STRIPE_PRICE_PRO`, or when a live key is placed in Development or a test key is placed in Production. Automatic tax is not enabled by the Starter because tax registration is product- and jurisdiction-specific.

The SQL file is for a new empty Starter database. It contains no legacy-data migration or backfill path.
