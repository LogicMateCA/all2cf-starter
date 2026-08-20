---
module: auth
status: development-released
source: starter
---

# Auth module

Purpose: provide the implemented Web identity foundation and the shared contracts required for later Expo identity. Organization membership, invitations, platform administration, and billing remain selectable Better Auth extensions rather than implied core behavior.

- Implemented identity providers: email/password and Google OAuth. Apple and optional GitHub remain template extensions.
- Session/token boundary: Host-only Web cookies and Expo SecureStore integration.
- Session authority: PostgreSQL remains authoritative on every request. Cookie session caching is disabled so password reset, sign out, and administrative revocation take effect immediately.
- Login state machine: email discovery in Development, password, registration, linked-provider setup, generic check-email, password reset, replacement-password login, and protected-route denial.
- Email verification is mandatory in every environment. The default provider is CFsend; Resend and Cloudflare Email Service are explicit switches. No environment may silently replace delivery with logging or outbox-only behavior.
- Email reliability: each message owns one outbox row, provider identity, stable idempotency key, provider message ID, attempt count, and failure code. CFsend/Resend retry only network, 429, and 5xx failures with the same idempotency key; permanent 4xx responses fail closed.
- Database boundary: Better Auth's built-in PostgreSQL/Kysely adapter uses per-request Hyperdrive pools. Schema changes are reviewed SQL migrations; Drizzle is not installed.
- Roles and permissions: the separation between platform and organization roles is a required future contract. Organization and Admin plugins are not currently enabled and must not be reported as implemented.
- Upgrade boundary: Better Auth core, the Expo plugin, and every later selected official plugin move as one reviewed stable-compatible line. Each upgrade generates a schema proposal, records compatibility, and adds immutable SQL migrations when needed.
- Sensitive data handling: provider credentials enter through the local development profile and Worker secrets.
- Global account entry: every authenticated primary surface exposes the active avatar or initials at the upper right. The menu contains identity, account/settings, System-Light-Dark appearance, language, conditional Admin, help/support, and sign out.
- Preference ownership: signed-in theme and locale persist on the user profile through `/api/preferences`; signed-out preferences remain device-local defaults. Expo preference UI is still pending.
- Accessibility: the account trigger has an explicit accessible name, menu focus is trapped/restored correctly, and every action is reachable by keyboard or native assistive technology.

All auth changes require explicit threat, migration, and rollback notes in a Change Spec. Keep states and permission behavior documented here.

Local verification uses `npm run auth:email:contract` for CFsend, Resend, and optional Cloudflare Email Service provider behavior. `npm run auth:smoke:dev` runs real workerd against Development PostgreSQL and a CFsend contract double, creates isolated identity data, verifies mandatory email verification plus the credential/reset/session cycle, and removes the owned user and outbox rows afterward. Google callback completion, real CFsend delivery, installed-device SecureStore behavior, and Production migration remain unverified until exercised in their target environments. The current Development environment has auth release evidence; the current Production release does not yet contain this auth line.

`npm run auth:schema:generate` writes a versioned proposal under ignored `db/generated/`; it never overwrites an applied migration. Upgrades compare that proposal to `db/migrations/` and add a new reviewed, immutable migration.
