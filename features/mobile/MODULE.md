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
- Local Setup owns write-only Expo/EAS, App Store Connect and Google Play release credential readiness plus read-only account/project/app tests. Those tests do not replace EAS build, installed-device, store submission or rollback evidence.
- Production requires the explicit phrase `正式发布移动端` or `production`.
- Native fingerprints decide Build versus Update; runtimeVersion remains appVersion.
- `mobile:targets` reports EAS Cloud, local Xcode, local Android SDK and optional connected-Mac availability. `MOBILE_ANDROID_BUILDER=auto|local|eas` and `MOBILE_IOS_BUILDER=auto|local|connected-mac|eas` override routing per platform. Auto prefers the actual local toolchain, then a configured Mac for iOS, then EAS. A bounded connected-Mac probe requires Darwin, Xcode and the exact Git commit; it never substitutes for store evidence.
- Linux/1Panel uses the isolated Compose `mobile` profile (`starter-android-builder`) with Node 24, JDK 17 and the host Android SDK mounted at `/opt/android-sdk`. Android build tools do not inflate or alter the normal Web/Worker development container.
- The same mobile Builder carries only the explicitly mounted Mac SSH key path and OpenSSH client for connected-Mac probing/build dispatch; Mac host and project root remain project-local settings.
- Connected-Mac SSH keeps host-key verification enabled through the read-only known-hosts mount; the workflow never falls back to `StrictHostKeyChecking=no`.
- iOS builds add Ruby's per-user Gem bin directory, preload the standard Logger library and force a UTF-8 locale when invoking CocoaPods, so CocoaPods 1.16.2 works in a non-interactive SSH session with the connected Mac's system Ruby 2.6.
- Development Simulator builds default to the Mac's active architecture through `MOBILE_IOS_SIMULATOR_ARCHITECTURES`, avoiding an unnecessary universal x86_64+arm64 compile; Preview/Production device archives retain normal distribution architectures.
- Development and Preview default to `arm64-v8a` through `MOBILE_ANDROID_ARCHITECTURES` so first local builds do not compile four ABIs unnecessarily; Production AAB leaves architectures to store defaults unless explicitly overridden. The Compose builder retains an isolated Gradle cache volume.
- Development reuses the generated native directory and native compiler cache after the first prebuild; `MOBILE_PREBUILD_CLEAN=true` forces regeneration. Preview and Production always use clean prebuilds for reproducibility.
- Tamagui 2.7.7 is the selected Mobile UI foundation, using `@tamagui/core` and package-level component imports with a minimal owned theme/token configuration.
- Expo Web uses Metro and `single` output. Desktop Web remains a separate shadcn/ui application and shares no Mobile UI code.
- Tamagui Compiler remains blocked on the current TypeScript 6/7 toolchain; runtime-only Web/iOS/Android exports are verified and compiler performance is unclaimed.
- Better Auth uses the official Expo client/server plugins, SecureStore-backed native cookies, deep-link schemes per Development/Preview/Production, and the same A2C-derived email/password, selected Google/GitHub/Apple, and reset state contract as Desktop Web. Apple retains a separate native bundle identifier for ID-token audience validation; installed-device Apple acceptance remains a release gate.
- Better Auth 1.7.2 requires both synchronous and asynchronous storage methods; the owned Web storage adapter and native SecureStore path implement that contract, and cookie access is awaited before constructing authenticated headers.
- Optional Expo Push materializes `expo-notifications~57.0.14` on the current SDK 57 compatibility line, its native config plugin and owned registration helper. Android creates a channel before requesting a token; both platforms use the EAS project ID. Because this changes native configuration, selection requires a new binary build.
- Metro resolves the Expo plugin's `better-auth/cookies` import to Better Auth's own focused `cookie-utils.mjs`. This avoids bundling server schema and all Zod locales; every aligned Better Auth upgrade must revalidate the resolver path and all three exports.
- Final visual templates and native chart renderer remain intentionally undecided until representative product screens are built and measured.

Use the project-local `expo-release` skill for every mobile release or rollback.

Validation boundary: the current SDK 57 patch matrix pins Expo `57.0.16`, Expo Router `57.0.16`, Expo Updates `57.0.17`, Expo Dev Client `57.0.15`, Expo Constants `57.0.14`, Metro Runtime `57.0.13` and Fingerprint `0.20.10`. Expo Doctor, dependency alignment, TypeScript, Mobile Web export, iOS export, Android export, bundle budgets, API reachability, and native fingerprint planning are verified. Browser Lighthouse/console inspection, EAS Project binding, remote builds/updates, installed-device auth/SecureStore E2E, Apple submission, Google submission, and mobile rollback remain unverified until their tools or account evidence exist.

Dependency audit boundary: the current npm audit findings are transitive Expo/Metro toolchain advisories with no critical item. npm proposes an incompatible SDK 53 downgrade; do not apply it or force overrides outside Expo's compatibility line. Recheck on every SDK 57 patch and move when Expo publishes a compatible fix.
