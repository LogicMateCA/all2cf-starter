---
title: API platform
description: Authenticate, meter and observe Starter API requests.
---

The optional API Platform composes Better Auth API keys, Stripe-backed entitlements, monthly usage metering, Cloudflare Queues and signed outgoing webhooks.

## Authentication

Create a key under `/app/api-keys`. Send it as `Authorization: Bearer <key>` or `x-api-key`. API keys never create browser sessions and the initial endpoint requires the `product:read` permission.

## First request

```bash
curl https://your-domain.example/api/v1/me \
  -H "Authorization: Bearer $API_KEY" \
  -H "Idempotency-Key: request-unique-id"
```

`Idempotency-Key` must contain 8–200 characters. Repeating the same key and amount returns the existing usage event rather than consuming quota twice.

## Quotas and errors

The neutral baseline grants 1,000 monthly `api.requests` to Free and 100,000 to Pro. Copied products own their real plan vocabulary.

- `400 IDEMPOTENCY_KEY_REQUIRED`: missing or malformed request key.
- `401 API_KEY_REQUIRED` or `INVALID_API_KEY`: missing, revoked, expired or unauthorized credential.
- `403 API_NOT_ENTITLED`: the resolved plan does not grant the meter.
- `429 API_QUOTA_EXCEEDED`: the monthly quota has been exhausted.

## Events

A newly recorded request emits `api.request.completed` to enabled user-owned webhook endpoints. Duplicate idempotency replays do not emit another event. Delivery uses the selected Cloudflare Queue retry and HMAC evidence contract.
