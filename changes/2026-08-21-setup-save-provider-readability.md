---
id: setup-save-provider-readability
title: Trustworthy Setup saving, deferred Provider keys, and readable type
status: implemented
affectedModules: [assembler, auth, admin, docs, marketing, mobile, product-shell]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, features/assembler/MODULE.md, features/auth/MODULE.md, features/admin/MODULE.md, features/docs/MODULE.md, /dp]
---

# Outcome

Every Setup step persists before navigation, Provider credentials can be safely deferred and later completed only from local Setup, and no Starter surface relies on unreadably small text.

# Scope

- Add a persistent save state, Save draft action, Save and continue behavior, unsaved-change warning, and a clear completion screen that remains on `/setup`.
- Recover a save interrupted by Vite reload and return an accidental root navigation to the saved Setup review state.
- Make Google, GitHub and Apple independently selectable Better Auth providers across Worker discovery, Web, Expo, Wrangler secrets and release sync. GitHub requires email scope; Apple dynamically signs ES256 client secrets and keeps native audience configuration explicit.
- Show credential readiness and source for Google, CFsend, Resend and Cloudflare Email Service without returning existing secret values.
- Add official application/configuration links for Google OAuth, CFsend, Resend, Stripe Test, Cloudflare Email Service, GitHub and Apple directly beside their Setup state.
- Pin `jose` 6.2.9 as the stable Apple JWT companion and keep selected social Provider names plus exact secret requirements synchronized into both Wrangler environments.
- Include Stripe Test credentials in the same configure-now/configure-later contract when Billing is selected or being prepared.
- Allow non-empty replacement values to be written only into project-local `.dev.vars`; choosing Configure later preserves the Provider selection and exposes its release blocker.
- Keep `/admin` Provider health read-only and direct operators back to local `npm run setup` for changes.
- Establish a `12px` absolute typography floor, raise existing smaller Web/Marketing text, and enforce the rule mechanically across application and pack source.
- Allow a saved executable `custom` Blueprint to pass the SaaS contract; the repository default remains `saas-foundation`, while Setup customization is validated through the ordinary assembly/dependency contracts instead of being rejected by a hard-coded preset name.

# Verification

- Verify draft save, Save and continue, final completion, reload recovery, Provider configured/deferred states, blank-value preservation, project-local secret replacement, Google/GitHub/Apple method discovery, Apple JWT claims, and no automatic materialization or deployment.
- Run typography, assembly, knowledge, typecheck, build, bundle, Worker dry-run, Auth and browser acceptance gates.

# Release

Implementation is not released. The user's saved Glassmorphism, Growth, hybrid tenancy/charging and selected SaaS Blueprint changes remain preserved and are not silently materialized.
