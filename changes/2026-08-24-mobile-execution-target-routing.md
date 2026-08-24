---
id: mobile-execution-target-routing
title: Route mobile work across EAS, local SDKs and a connected Mac
status: implemented
affectedModules: [mobile]
docsImpact: [features/mobile/MODULE.md, skills/expo-release/SKILL.md, skills/expo-release/references/release-contract.md]
---

# Outcome

Mobile planning and Development/Preview execution select a builder independently for iOS and Android instead of assuming EAS Cloud or deciding from the host OS alone. It distinguishes EAS Cloud, local Xcode, local Android SDK and an optionally configured connected Mac.

# Scope

Add `mobile:targets`, include target routing in every mobile plan, and support a bounded connected-Mac SSH probe through `MOBILE_MAC_HOST`, `MOBILE_MAC_PROJECT_ROOT`, and optional `MOBILE_MAC_SSH_KEY_PATH`. The probe records only Darwin, Xcode and Git commit evidence. Remote release continues to require Expo project identity; a connected Mac never becomes fake store evidence.

Local builds use Expo CNG only to generate native projects. Android then runs Gradle directly: Development produces a debug APK, Preview requires a real upload keystore and produces a signed release APK, and Production requires the same explicit signing inputs and produces an AAB. iOS runs on macOS: Development builds the Simulator through Xcode, while Preview/Production archive and export an IPA using an explicit ExportOptions plist. EAS remains an optional provider, not the default requirement.

Factory output excludes generated `apps/mobile/android`, `apps/mobile/ios` and local build artifacts. Each customer project regenerates native directories from its own exact config and selected Builder rather than inheriting the source machine's build tree.

The canonical Linux/1Panel environment isolates Android tooling in a Compose `mobile` profile with Node 24, JDK 17 and the host SDK mount. This keeps normal Web/Worker startup small while still making the local Gradle path reproducible.

Connected-Mac dispatch first installs the exact lockfile without lifecycle scripts, then runs the checked-in iOS builder. The Mac probe refuses a source directory whose Git commit differs from the controller commit.

The verified Mac has Xcode 26.6 and system Ruby 2.6 but no Homebrew. CocoaPods `1.16.2` is installed in the user's Gem directory; the builder prepends that exact user Gem bin path, preloads Ruby Logger and forces UTF-8 instead of mutating system Ruby. The first universal Simulator build produced and launched `com.logicm8.starter.dev` on iPhone 17 Pro; subsequent Development builds default to the active arm64 architecture to avoid duplicate x86_64 compilation.

Connected Xcode runs use quiet output and an explicit 64 MiB controller buffer. This prevents verbose native output from overflowing `spawnSync`, falsely returning failure and orphaning a still-running remote build.

Development/Preview default to `arm64-v8a`, matching the normal physical-device path and avoiding an unnecessary four-ABI native compile; Production AAB retains store-default architecture coverage. Gradle downloads are retained only in the isolated Builder volume.

# Verification

Require `mobile:targets:contract` to prove routing and `mobile:local-build:contract` to lock the Android Gradle tasks, non-debug signing inputs, Xcode build/archive/export commands and missing-toolchain failures. Run Expo dependency checks, Doctor, TypeScript, all-platform export, fingerprints, bundle budgets, AI/knowledge contracts and full repository verification.

# Release

Engine `2.0.0-dev.26` is the explicitly selected Development candidate for the completed local-builder expansion. Target contracts pass Android Gradle task/signing policy, iOS Xcode build/archive/export policy, per-platform auto/explicit routing and missing-toolchain failures. On exact commit `361676612de7248986ea8dd1c80f66e343947933`, the isolated Linux Builder produced an arm64 Development APK through `app:assembleDebug` with SHA-256 `a2c00de8c4d8a7e9eb7ea0f011066245af45eef43d946fc7637e7cf242298aba`; APK signature and package `com.logicm8.starter.dev` were verified. Connected Mac `192.168.0.178` built an arm64 Xcode Simulator app, verified its signature, installed it on iPhone 17 Pro Simulator and launched `com.logicm8.starter.dev`. Stable, Production and all mobile stores remain unchanged.
