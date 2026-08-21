---
id: account-security-2fa
title: Add optional Better Auth TOTP account security
status: local-verified
affectedModules: [assembler, auth, account-security, product-shell, web]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/auth/MODULE.md, features/account-security/MODULE.md, starter.manifest.json, catalog/catalog.json, catalog/saas-capabilities.json, /setup, /dp]
---

# Outcome

A copied project can select a complete Better Auth TOTP second-factor flow rather than displaying an unavailable Settings row. The default personal/free Starter remains unchanged until the pack is selected.

# Security contract

- Use the official Better Auth Two-Factor server and client plugins aligned with core `1.7.1`; do not create a parallel TOTP implementation.
- Require the account password to enroll, rotate recovery codes, or disable 2FA. Do not allow passwordless management in this pack.
- Require a valid enrollment TOTP before activation, limit the challenge cookie to ten minutes, allow an explicit 30-day trusted-device choice, and lock the account challenge for 15 minutes after five consecutive failed second-factor attempts.
- Store the plugin secret and recovery-code representation only in PostgreSQL. Show plaintext recovery codes only in the one-time generation response.
- Keep email/SMS OTP and Passkeys separate. Passkeys require the independently versioned `@better-auth/passkey` package and real WebAuthn evidence.

# Assembly and UI

- Materialization contributes the server/client plugins, empty-database SQL, `/app/security/two-factor`, `/two-factor`, lazy chunks and Account Settings link. Deselection removes all of them and restores the generated registries.
- The sign-in client redirects Better Auth's pending two-factor state to the challenge route while retaining a same-origin return path.
- Enrollment exposes the standard authenticator URI and manual key. No fake QR image or unreviewed QR dependency is shipped.

# Verification

- Run the selected temporary empty-PostgreSQL workerd flow for enrollment, TOTP activation, challenged password sign-in, invalid code, recovery code, disablement, schema state and security audit/notification evidence.
- Run selected desktop/mobile, light/dark browser acceptance for Account Settings, enrollment and challenge routes.
- Run type checks, build, bundle budget, dry runs, deselection, default regression, dependency alignment, knowledge synchronization and change checks.

# Current evidence

- The selected disposable empty-PostgreSQL workerd flow passes pending enrollment, one invalid enrollment code, valid TOTP activation, password sign-in redirect without a session, TOTP completion, one-time backup-code completion and replay denial, recovery-code rotation, disablement, table cleanup, three exact audit events and three recipient security notifications.
- The selected production build isolates the enrollment route to 1.73 KB gzip and the challenge route to 1.05 KB gzip. The authenticated browser matrix passes 36 desktop/mobile, light/dark cases and 60 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T04-51-07-064Z/authenticated`.
- The generated Better Auth `1.7.1` SQL proposal matches the owned `app_user.two_factor_enabled` and `app_two_factor` baseline. The pack was deselected and removed; the default Blueprint and materialization receipt returned clean.

# Release

No deployment is authorized. Development and Production remain unchanged.
