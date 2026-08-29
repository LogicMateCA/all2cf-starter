# Upgrade acceptance matrix

| Runtime family | Version authority | Required acceptance |
| --- | --- | --- |
| Cloudflare | Official Cloudflare MCP/docs, npm stable | Types for both configs, typecheck, build, both dry runs, real Development release, MCP read-back |
| Web | npm stable and framework release notes | Typecheck, production build, route smoke test, bundle-size comparison |
| Expo | Current stable Expo SDK compatibility table | `expo install --check`, Expo Doctor, iOS/Android export, fingerprint, remote Build/Update and device E2E when configured |
| Better Auth | Official stable docs, changelog, security notices | Aligned core/plugins, reviewed SQL, Development migration, auth/session/OAuth/Admin regression |
| Stripe | Better Auth Stripe peer range and Stripe SDK changelog | Signed webhook, idempotency, checkout, subscription lifecycle, entitlement regression |
| PostgreSQL client | node-postgres changelog and project SQL tests | Typecheck, query tests, both Development and Production health identity checks |

An upgrade is not accepted merely because installation succeeds. Record the exact versions, commit, test results, Development release identity, and rollback commit.
