---
module: account-security
status: local-verified
source: starter
---

# Account security module

Purpose: provide optional strong sign-in factors through official Better Auth plugins without changing the mandatory verified-email and session baseline.

- `saas.account-security-2fa` owns Better Auth TOTP enrollment, a separate second-factor sign-in challenge, trusted-device choice, one-time recovery codes, recovery-code rotation, password-confirmed disablement, and account-level failed-attempt lockout.
- TOTP enrollment is not active until a valid authenticator code verifies the pending secret. `skipVerificationOnEnable` remains false.
- Five consecutive failed second-factor attempts lock the account challenge for 15 minutes. TOTP and backup-code attempts share the same Better Auth account counter.
- Backup codes are shown only when first generated or deliberately rotated. Each works once. The Starter does not add a general endpoint that exposes stored recovery codes.
- Email/SMS OTP is deliberately not enabled: the reusable default keeps the second factor independent from the mailbox used for recovery.
- The Web template exposes the standard `otpauth://` URI and manual secret without adding a QR runtime dependency. A copied product may add a reviewed QR renderer.
- Passkeys remain a separate planned pack because Better Auth moved them to `@better-auth/passkey`; adding that dependency requires a clean reviewed runtime slice and WebAuthn browser/device evidence.
- The SQL is the final selected empty-database baseline. Existing initialized products own their later schema migration separately.

Local verification must cover pending enrollment, valid TOTP activation, password sign-in challenge, invalid-code rejection, trusted-device choice, one-time backup-code recovery, disablement, lazy Web routes, and clean materializer removal. Development and Production remain separate release evidence.
