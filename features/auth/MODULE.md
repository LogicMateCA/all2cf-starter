---
module: auth
status: local-verified
source: starter
---

# Auth module

Purpose: provide the implemented Web identity foundation, platform administration authority, and shared contracts required for later Expo identity. Organization membership, invitations, and billing remain selectable Better Auth extensions rather than implied core behavior.

- Implemented identity providers: email/password and Google OAuth. Apple and optional GitHub remain template extensions.
- Session/token boundary: Host-only Web cookies and Expo SecureStore integration.
- Session authority: PostgreSQL remains authoritative on every request. Cookie session caching is disabled so password reset, sign out, and administrative revocation take effect immediately.
- Login state machine: email discovery in Development, password, registration, linked-provider setup, generic check-email, password reset, replacement-password login, and protected-route denial.
- Email verification is mandatory in every environment. The default provider is CFsend; Resend and Cloudflare Email Service are explicit switches. No environment may silently replace delivery with logging or outbox-only behavior.
- Email reliability: each message owns one outbox row, provider identity, stable idempotency key, provider message ID, attempt count, and failure code. CFsend/Resend retry only network, 429, and 5xx failures with the same idempotency key; permanent 4xx responses fail closed.
- Database boundary: Better Auth's built-in PostgreSQL/Kysely adapter uses per-request Hyperdrive pools. Schema changes are reviewed SQL migrations; Drizzle is not installed.
- Account identity boundary: Better Auth 1.7.1 identifies external accounts by `(issuer, account_id)`. The Starter's initial empty-database schema creates that field and unique index directly. Legacy identity backfill belongs to an existing product upgrade and is intentionally absent here.
- Roles and permissions: Better Auth's official Admin plugin owns platform `user` and `admin` roles, bans, session revocation, impersonation support, and user administration endpoints. The Starter does not maintain a parallel `platformRole` field. Optional Organization roles remain a separate future contract and never grant platform Admin access implicitly.
- Upgrade boundary: Better Auth core, Admin, Expo, and every later selected official plugin move as one reviewed stable-compatible line. Each upgrade generates a schema proposal, records compatibility, and updates the empty-project SQL baseline when needed.
- Sensitive data handling: provider credentials enter through the local development profile and Worker secrets.
- Global account entry: every authenticated primary surface exposes the active avatar or initials at the upper right. The menu contains identity, account/settings, System-Light-Dark appearance, language, conditional Admin, help/support, and sign out.
- Preference ownership: signed-in theme and locale persist on the user profile through `/api/preferences`; signed-out preferences remain device-local defaults. Expo preference UI is still pending.
- Accessibility: the account trigger has an explicit accessible name, menu focus is trapped/restored correctly, and every action is reachable by keyboard or native assistive technology.

All auth changes require explicit threat, migration, and rollback notes in a Change Spec. Keep states and permission behavior documented here.

Local verification uses `npm run auth:email:contract` for CFsend, Resend, and optional Cloudflare Email Service provider behavior. By default, `npm run auth:smoke:dev` creates a temporary empty PostgreSQL database, applies the complete Starter baseline, runs real workerd with a CFsend contract double, verifies issuer-scoped identity, mandatory email verification, the credential/reset/session cycle, Better Auth Admin user readback, support authorization, and privileged audit evidence, then force-drops that database. An explicit isolated database URL may replace the temporary database. The smoke test never uses a shared Starter database implicitly. Google callback completion, real CFsend delivery, installed-device SecureStore behavior, and remote environment release remain unverified until exercised in their target environments.

`npm run auth:schema:generate` creates and drops a temporary empty PostgreSQL database and writes a versioned proposal under ignored `db/generated/`. Upgrades compare that proposal to `db/migrations/`. Starter databases are created empty from the current baseline; no legacy data migration or backfill belongs in this repository. An already initialized product must own its separate upgrade migration.
