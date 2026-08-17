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
- Final visual templates and native chart renderer remain intentionally undecided until representative product screens are built and measured.

Use the project-local `expo-release` skill for every mobile release or rollback.

Validation boundary: Expo Doctor, TypeScript, Mobile Web HTTP/export, iOS export, Android export, API reachability, and native fingerprint planning are verified. Browser Lighthouse/console inspection, EAS Project binding, remote builds/updates, installed-device E2E, Apple submission, Google submission, and mobile rollback remain unverified until their tools or account evidence exist.
