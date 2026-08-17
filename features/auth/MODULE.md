---
module: auth
status: local-verified
source: starter
---

# Auth module

Purpose: provide Web and Expo identity, product-specific sessions, organization membership, invitation, and platform-role boundaries through Better Auth.

- Implemented identity providers: email/password and Google OAuth. Apple and optional GitHub remain template extensions.
- Session/token boundary: Host-only Web cookies and Expo SecureStore integration.
- Session authority: PostgreSQL remains authoritative on every request. Cookie session caching is disabled so password reset, sign out, and administrative revocation take effect immediately.
- Login state machine: email discovery in Development, password, registration, linked-provider setup, generic check-email, password reset, replacement-password login, and protected-route denial.
- Database boundary: Better Auth's built-in PostgreSQL/Kysely adapter uses per-request Hyperdrive pools. Schema changes are reviewed SQL migrations; Drizzle is not installed.
- Roles and permissions: platform roles remain separate from organization roles.
- Sensitive data handling: provider credentials enter through the local development profile and Worker secrets.
- Global account entry: every authenticated primary surface exposes the active avatar or initials at the upper right. The menu contains identity, account/settings, System-Light-Dark appearance, language, conditional Admin, help/support, and sign out.
- Preference ownership: signed-in theme and locale persist on the user profile through `/api/preferences`; signed-out preferences remain device-local defaults. Expo preference UI is still pending.
- Accessibility: the account trigger has an explicit accessible name, menu focus is trapped/restored correctly, and every action is reachable by keyboard or native assistive technology.

All auth changes require explicit threat, migration, and rollback notes in a Change Spec. Keep states and permission behavior documented here.

Local verification uses `npm run auth:smoke:dev` against real workerd and the Development PostgreSQL database. It creates isolated test identity data, verifies the full credential/reset/session cycle, and removes the owned user and outbox rows afterward. Google callback completion, real CFsend delivery, installed-device SecureStore behavior, and Production migration remain unverified until exercised in their target environments.

`npm run auth:schema:generate` writes a versioned proposal under ignored `db/generated/`; it never overwrites an applied migration. Upgrades compare that proposal to `db/migrations/` and add a new reviewed, immutable migration.
