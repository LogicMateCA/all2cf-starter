---
module: mobile
status: implemented
source: starter
---

# Mobile module

Purpose: provide an Expo Router SDK 57 application shell and a deterministic EAS development, preview, E2E, update, build, submit, and rollback contract.

- Development and Preview call `https://dev.logicm8.com`.
- Production calls `https://starter.logicm8.com`.
- Generic mobile release intent targets Development.
- Production requires the explicit phrase `正式发布移动端` or `production`.
- Native fingerprints decide Build versus Update; runtimeVersion remains appVersion.
- UI kit, design profile, and native chart renderer are intentionally not selected by this module.

Use the project-local `expo-release` skill for every mobile release or rollback.
