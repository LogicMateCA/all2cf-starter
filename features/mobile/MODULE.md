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
- UI kit, design profile, and native chart renderer are intentionally not selected by this module.

Use the project-local `expo-release` skill for every mobile release or rollback.

Validation boundary: Expo Doctor, TypeScript, iOS export, Android export, API reachability, and native fingerprint planning are verified. EAS Project binding, remote builds/updates, installed-device E2E, Apple submission, Google submission, and mobile rollback remain unverified until real account evidence exists.
