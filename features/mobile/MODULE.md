---
module: mobile
status: local-verified
source: starter
---

# Mobile module

Purpose: provide an Expo Router SDK 57 application shell and a deterministic EAS development, preview, E2E, update, build, submit, and rollback contract.

- Development and Preview use the Development domain declared in `starter.config.json`.
- Production uses the Production domain declared in `starter.config.json`.
- Generic mobile release intent targets Development.
- Production requires the explicit phrase `正式发布移动端` or `production`.
- Native fingerprints decide Build versus Update; runtimeVersion remains appVersion.
- Base UI strategy: thin product-owned primitives and tokens over React Native/Expo; no full custom framework.
- Tamagui is permitted as a complete optional template profile, not installed in the base and not mixed piecemeal with another full UI system.
- Final visual templates and native chart renderer remain intentionally undecided until representative product screens are built and measured.

Use the project-local `expo-release` skill for every mobile release or rollback.

Validation boundary: Expo Doctor, TypeScript, iOS export, Android export, API reachability, and native fingerprint planning are verified. EAS Project binding, remote builds/updates, installed-device E2E, Apple submission, Google submission, and mobile rollback remain unverified until real account evidence exists.
