---
id: mobile-device-build-chain
title: Make local mobile builders and physical-device evidence canonical
status: implemented
affectedModules: [mobile, release, setup]
docsImpact: [README.md, RELEASE.md, 碰见问题记录.md]
---

# Outcome

iOS defaults to the Logicmate Starter connected-Mac builder and Android defaults to local Gradle. EAS is available only after explicit selection and never acts as an automatic fallback.

# Contract

The iOS path is Windows Codex -> Starter plugin host runner -> Mac keychain unlock -> headless Xcode -> signed app/archive -> physical-device install and cold launch -> evidence -> release contract. WSL SSH and bare Xcode are rejected as release paths.

# Verification

- `npm run mobile:targets:contract`
- `npm run typecheck`
- `npm run build:sites`
- Logicmate Starter plugin tests and installed-cache verification

The Change Spec enforcement baseline advances to the released 2.3.2 `main` merge commit so this release checks only subsequent work.
