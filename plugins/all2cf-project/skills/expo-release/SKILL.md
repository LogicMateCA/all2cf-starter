---
name: all2cf-expo-release
description: Plan, locally build, update, submit, verify or roll back the Expo-based iOS and Android app in an All2CF-generated project, including local Gradle, Mac/Xcode and optional EAS routing.
---

# All2CF Expo release

Read the project's `skills/expo-release/SKILL.md`; it owns the exact profiles, commands and evidence contract.

Detect available execution targets rather than checking only the host OS: local Android SDK/JDK, local macOS/Xcode, a connected Mac, and optional EAS Cloud. Follow the project's per-platform Builder selection; `auto` prefers real local Android and local/connected Xcode before EAS. Expo remains the framework/CNG layer even when EAS Cloud is unused.

Use the native fingerprint to choose an EAS Update only when EAS Updates is configured; otherwise build a new local binary. Track iOS and Android independently through build, upload, store processing, review and release; a successful local build or upload is not a completed store release. Production requires explicit mobile Production wording.

All2CF MCP is not the default build executor. Add it only if All2CF later owns a remote Mac, build quota or mobile release record service.
