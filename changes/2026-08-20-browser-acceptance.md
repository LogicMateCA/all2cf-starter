---
id: browser-acceptance
title: Make cross-surface browser acceptance repeatable
status: local-verified
affectedModules: [assembler, marketing, web, admin, support, organizations, billing, docs]
docsImpact: [PROJECT.md, DESIGN.md, PERFORMANCE.md, features/assembler/MODULE.md, features/marketing/MODULE.md, features/product-shell/MODULE.md, apps/docs/src/content/docs/docs/guides/using-starter.md, /dp]
---

# Outcome

Starter owns a repeatable, disposable browser-acceptance gate for the real merged Worker surface. It captures current screenshots and machine-readable evidence for Marketing, Better Auth, Product Shell, notifications, account settings, Support, Admin, Docs and `/dp` instead of relying on historical screenshots or an operator-specific browser installation.

# Decisions

- Keep browser tooling development-only and run it in a pinned Playwright container profile sharing the running Development container's network namespace. It must not enter the Worker, Astro, React or Expo production bundles.
- Use the built `dist/web` tree behind local Wrangler/workerd as the acceptance seam. Vite-only evidence cannot promote a Worker route.
- Keep `/setup` local-only. Its own Vite acceptance mode exercises the real loopback-only configuration API and StyleKit selector without weakening the deployed Worker's intentional 404 boundary.
- `npm run dev:worker` loads `.dev.vars`, rewrites the local Hyperdrive endpoint from the canonical Development database profile, and starts Wrangler without requiring AI to reconstruct secrets or connection flags.
- Reuse the existing authentication smoke harness so authenticated browser cases run against an isolated temporary PostgreSQL database, a CFsend contract double and short-lived Better Auth users. Never reuse a shared Development or Production account.
- Pin current stable Playwright, axe-core and Lighthouse versions and review them through the ordinary dependency policy.
- Capture desktop and mobile, light and dark, reduced motion, HTTP/final URL, headings, selected StyleKit identity, horizontal overflow, console/page/network failures, axe violations, interaction results and screenshots in one ignored evidence directory.
- Keep optional PowerAI families absent by contract until selected. Their browser matrix runs only after a disposable all-family materialization and the default Blueprint must be restored afterward.
- Keep `starter.manifest.json.state` aligned to the strongest evidence for the current source tree. Historical Development or Production releases cannot promote unreleased source changes.

# Acceptance

- Public Core routes, login, Docs and `/dp` pass against the real merged Worker.
- A verified platform Admin session passes Product Shell, notification bell, account menu, settings, Support and Admin interactions in the isolated workerd flow; anonymous protected-route behavior remains separately checked.
- Every accepted screenshot is visually inspected. Machine checks do not replace visual review.
- The report binds evidence to the built artifact hash and records unverified external seams such as real Google OAuth, real CFsend delivery and remote provider reachability.
- `npm run verify`, the full auth workerd smoke, knowledge synchronization and change checks pass after the gate is added.

# Current evidence

- Default public Worker evidence: 48 desktop/mobile, light/dark cases and 50 screenshots passed with zero failures at `test-results/browser-acceptance/2026-08-20T23-15-05-757Z/public`; artifact SHA-256 `ca1d11d60162ce9183b0b4d923ebfe93db8ea1eb7630059ab4dc7a9ca815865b`.
- Isolated authenticated evidence: 28 cases and 40 screenshots passed with zero failures at `test-results/browser-acceptance/2026-08-20T23-17-10-327Z/authenticated`, including the Bell, account menu, mobile drawer, Settings, notifications, Support and Admin; artifact SHA-256 `ca1d11d60162ce9183b0b4d923ebfe93db8ea1eb7630059ab4dc7a9ca815865b`. The same run completed the full Better Auth/CFsend workerd smoke against a disposable PostgreSQL database.
- Local Setup evidence: four desktop/mobile, light/dark cases and eight screenshots passed with zero failures at `test-results/browser-acceptance/2026-08-20T23-16-44-007Z/local-setup`; the interaction screenshot renders all 50 selectable StyleKit previews and is bound to artifact SHA-256 `ca1d11d60162ce9183b0b4d923ebfe93db8ea1eb7630059ab4dc7a9ca815865b`.
- After the StyleKit diversity curation, a replacement Local Setup run passed four desktop/mobile, light/dark cases and eight screenshots with zero failures at `test-results/browser-acceptance/2026-08-20T23-53-47-473Z/local-setup`. Manual review confirms all 28 pinned source-cover previews render, including the final offscreen cultural systems; the prior 50-option screenshot remains historical evidence only.
- The current function-first Setup order and expanded 20-capability Catalog passed four desktop/mobile, light/dark cases and eight screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T05-10-59-003Z/local-setup`; Design remains step 6 after Product, SaaS, Capabilities, Providers and Pages. After every optional-pack removal, the current default authenticated baseline passed 28 cases and 48 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T05-22-32-541Z/authenticated`, including persisted Dashboard activity, Admin announcements and filtered Admin Audit.
- Disposable optional-pack acceptance also passed without changing the default Blueprint: Organizations passed 32 cases and 52 screenshots at `test-results/browser-acceptance/2026-08-21T04-19-50-730Z/authenticated`; Billing passed 32 cases and 52 screenshots at `test-results/browser-acceptance/2026-08-21T04-29-16-643Z/authenticated`. Both selected packs were removed through the materializer and the default receipt returned clean.
- Account Security 2FA passed 36 desktop/mobile, light/dark cases and 60 screenshots at `test-results/browser-acceptance/2026-08-21T04-51-07-064Z/authenticated`, covering Settings enrollment and the Worker-first sign-in challenge. The complete API SaaS composition passed 36 cases and 60 screenshots at `test-results/browser-acceptance/2026-08-21T05-06-10-156Z/authenticated`, including Billing and the Developer portal. Both disposable selections were removed afterward.
- Disposable PowerAI Growth evidence: 32 index/detail cases and screenshots passed with zero failures at `test-results/browser-acceptance/2026-08-20T22-42-12-066Z/public`; RSS returned HTTP 200 and `application/xml`. The default Blueprint was then restored and Growth source/output/dependency absence was verified.
- All accepted screenshots were visually inspected. Real Google OAuth callback, real mailbox delivery, remote provider reachability, Development deployment and Production remain separate evidence lanes.

# Release

No deployment, shared database mutation or Production action is authorized by this change.
