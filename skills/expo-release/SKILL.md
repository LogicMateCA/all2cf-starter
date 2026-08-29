---
name: expo-release
description: Build, release and operate the Expo-based mobile app through local Android, local or connected-Mac Xcode, or optional EAS Cloud. Use for mobile build, update, preview, E2E, submit, production release or rollback; report the exact builder and artifact evidence.
---

# Expo release

Use this skill for the complete mobile lifecycle. Expo Router, Expo Modules and CNG are the application framework; EAS Cloud is only one optional build/update provider. Do not call a build, update, submit, or rollback successful until the exact artifact and verification evidence are recorded.

The Starter baseline currently has local verification only. Until a real Expo project, remote builds, installed Preview E2E, both store submissions, and an Update rollback have been recorded, report those stages as unverified rather than describing this skill as fully validated.

## Target selection

- Generic mobile release/build/update requests target **development**.
- “preview” explicitly targets **preview**.
- Only explicit “正式发布移动端” or “production” targets **production**.
- Never infer production from “发布”, “release”, or “ship”. If the requested target is ambiguous, stop and ask.

## Required workflow

1. Read repository instructions, inspect `apps/mobile/package.json`, Expo config, `eas.json`, native directories, and environment/profile files. Use existing project scripts; do not duplicate their implementation or invent a UI kit/chart library. In this starter, check root scripts such as `npm run starter:provision`, `npm run release:dev`, and `npm run release:production` when applicable.
   Run `npm run mobile:targets` before planning. Builder selection is per platform: `MOBILE_ANDROID_BUILDER=auto|local|eas` and `MOBILE_IOS_BUILDER=auto|local|connected-mac|eas`. Auto prefers a real local toolchain, then connected Mac for iOS, then EAS. Use `npm run mobile:targets -- --probe` only when `MOBILE_MAC_HOST` and `MOBILE_MAC_PROJECT_ROOT` are configured; it must prove Darwin, Xcode and the remote Git commit.
2. Require a clean Git worktree and record the exact commit. Do not release from uncommitted or mixed-product changes.
3. Run the mobile verification scripts from `apps/mobile/package.json` (including lint, typecheck, unit/E2E, and build checks when present). Record command, result, and artifact/log location. A successful command alone is not proof of route or API parity.
4. Resolve and record the exact API environment/base URL, builder per platform, app identifier, and release target. Require EAS profile/channel/project only when EAS is selected. Local Android requires SDK/JDK; local or connected iOS requires Xcode. Fail closed on missing or conflicting values.
5. Resolve `runtimeVersion` and native fingerprint with the explicitly pinned `@expo/fingerprint` command used by the repository. Fingerprint is used only to decide whether a new native build is required. The app runtimeVersion remains the app version; never replace it with a fingerprint.
6. Choose the smallest valid operation. EAS Update is available only when the project selected EAS Updates. Native dependency, config-plugin, permission, SDK or binary changes require a native build through the selected per-platform builder. Record a local Artifact path/SHA or EAS build/update ID plus fingerprint.
7. For preview, verify the published preview update on the preview channel/profile with the Development API and exact commit. Where binary compatibility allows, republish that exact verified EAS Update group to Production. Runtime API selection must follow the installed update channel so the promoted bundle uses the Production API; do not bake a Preview-only API into a promotable JS bundle. Native changes require a production build.
8. For production native changes, create both Apple and Android artifacts through their selected builders. EAS builds may use the Production submit profile; local Android produces a signed AAB and local/connected Xcode produces an archive plus exported IPA. Submission remains a separate gate: poll App Store Connect and Google Play to terminal status and record them separately. One platform succeeding does not make the two-platform release complete.

## Evidence and handoff

Use [references/release-contract.md](references/release-contract.md) for the builder/command/evidence matrix. Report target and authorization, commit, API environment, builder per platform, app version/runtimeVersion, fingerprints, local Artifact path/SHA or EAS IDs, verification, submission/promotion, rollback point and unresolved gates. Never label a local build, HTTP 200, or source-only check as a completed store release.
