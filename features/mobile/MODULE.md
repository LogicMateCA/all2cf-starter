---
module: mobile
status: local-verified
source: starter
---

# Mobile module

Purpose: provide a touch-first Expo Router SDK 57 application shell for Mobile Web, iOS, and Android plus a deterministic EAS development, preview, E2E, update, build, submit, and rollback contract.

- Development and Preview use the Development domain declared in `starter.config.json`.
- Production uses the Production domain declared in `starter.config.json`.
- Generic mobile release intent targets Development.
- Production requires the explicit phrase `正式发布移动端` or `production`.
- Native fingerprints decide Build versus Update; runtimeVersion remains appVersion.
- Tamagui 2.7.7 is the selected Mobile UI foundation, using `@tamagui/core` and package-level component imports with a minimal owned theme/token configuration.
- Expo Web uses Metro and `single` output. Desktop Web remains a separate shadcn/ui application and shares no Mobile UI code.
- Tamagui Compiler remains blocked on the current TypeScript 6/7 toolchain; runtime-only Web/iOS/Android exports are verified and compiler performance is unclaimed.
- Better Auth uses the official Expo client/server plugins, SecureStore-backed native cookies, deep-link schemes per Development/Preview/Production, and the same A2C-derived email/password, selected Google/GitHub/Apple, and reset state contract as Desktop Web. Apple retains a separate native bundle identifier for ID-token audience validation; installed-device Apple acceptance remains a release gate.
- Better Auth 1.7.1 requires both synchronous and asynchronous storage methods; the owned Web storage adapter and native SecureStore path implement that contract, and cookie access is awaited before constructing authenticated headers.
- Metro resolves the Expo plugin's `better-auth/cookies` import to Better Auth's own focused `cookie-utils.mjs`. This avoids bundling server schema and all Zod locales; every aligned Better Auth upgrade must revalidate the resolver path and all three exports.
- Final visual templates and native chart renderer remain intentionally undecided until representative product screens are built and measured.

Use the project-local `expo-release` skill for every mobile release or rollback.

Validation boundary: Expo Doctor, dependency alignment, TypeScript, Mobile Web export, iOS export, Android export, bundle budgets, API reachability, and native fingerprint planning are verified. Browser Lighthouse/console inspection, EAS Project binding, remote builds/updates, installed-device auth/SecureStore E2E, Apple submission, Google submission, and mobile rollback remain unverified until their tools or account evidence exist.

Dependency audit boundary: the current npm audit findings are transitive Expo/Metro toolchain advisories with no critical item. npm proposes an incompatible SDK 53 downgrade; do not apply it or force overrides outside Expo's compatibility line. Recheck on every SDK 57 patch and move when Expo publishes a compatible fix.
