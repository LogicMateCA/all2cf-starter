# Account security 2FA pack

This optional pack uses Better Auth's built-in Two-Factor plugin on the same `1.7.2` line as core. It provides verified TOTP enrollment, sign-in challenges, trusted-device choice, one-time backup-code recovery, backup-code rotation, account lockout, and password-confirmed disablement.

The Starter does not enable email/SMS OTP by default. TOTP keeps the second factor independent from the mailbox used for account recovery. The enrollment page exposes the standard `otpauth://` URI and manual secret without adding a QR runtime dependency; a copied product may add a reviewed QR renderer later.

The SQL is the selected empty-database baseline only. Existing products own their later upgrade migration separately.
