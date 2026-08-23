---
name: all2cf-expo-release
description: Plan, build, update, submit, verify or roll back the Expo iOS and Android app in an All2CF-generated project, including EAS cloud and connected Mac routing.
---

# All2CF Expo release

Read the project's `skills/expo-release/SKILL.md`; it owns the exact profiles, commands and evidence contract.

Detect available execution targets rather than checking only the host OS: local macOS/Xcode, a connected Mac runner, EAS cloud macOS, local Android SDK, and EAS cloud Android. Prefer EAS cloud for reproducible normal builds. Use a local or connected Mac for Xcode compilation, Simulator/real-device debugging, native failure reproduction, Archive or manual Apple upload.

Use the native fingerprint to choose EAS Update versus a new binary. Track iOS and Android independently through build, upload, store processing, review and release; a successful upload is not a completed store release. Production requires explicit mobile Production wording.

All2CF MCP is not the default build executor. Add it only if All2CF later owns a remote Mac, build quota or mobile release record service.
