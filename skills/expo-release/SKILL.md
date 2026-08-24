---
name: expo-release
description: Release and operate an Expo mobile app in this Starter repository. Use for mobile build, update, preview, E2E, submit, production release, rollback, or requests such as “发布移动端”; inspect the repository and apps/mobile scripts first, then produce evidence for the exact API environment, EAS profile/channel, commit, runtimeVersion, fingerprint, build/update IDs, and verification status.
---

# Expo release

Use this skill for the complete Expo/EAS release lifecycle. It is evidence-led: do not call a build, update, submit, or rollback successful until the exact artifact and verification evidence are recorded.

The Starter baseline currently has local verification only. Until a real Expo project, remote builds, installed Preview E2E, both store submissions, and an Update rollback have been recorded, report those stages as unverified rather than describing this skill as fully validated.

## Target selection

- Generic mobile release/build/update requests target **development**.
- “preview” explicitly targets **preview**.
- Only explicit “正式发布移动端” or “production” targets **production**.
- Never infer production from “发布”, “release”, or “ship”. If the requested target is ambiguous, stop and ask.

## Required workflow

1. Read repository instructions, inspect `apps/mobile/package.json`, Expo config, `eas.json`, native directories, and environment/profile files. Use existing project scripts; do not duplicate their implementation or invent a UI kit/chart library. In this starter, check root scripts such as `npm run starter:provision`, `npm run release:dev`, and `npm run release:production` when applicable.
   Run `npm run mobile:targets` before planning. Use `npm run mobile:targets -- --probe` only when `MOBILE_MAC_HOST` and `MOBILE_MAC_PROJECT_ROOT` are configured; it must prove Darwin, Xcode and the remote Git commit. A configured or reachable Mac is Xcode/debug evidence, not an EAS project, signed archive, submission or store release.
2. Require a clean Git worktree and record the exact commit. Do not release from uncommitted or mixed-product changes.
3. Run the mobile verification scripts from `apps/mobile/package.json` (including lint, typecheck, unit/E2E, and build checks when present). Record command, result, and artifact/log location. A successful command alone is not proof of route or API parity.
4. Resolve and record the exact API environment/base URL, EAS profile, channel, app identifier, and Expo project. Fail closed on missing or conflicting values; do not silently substitute development credentials.
5. Resolve `runtimeVersion` and native fingerprint with the explicitly pinned `@expo/fingerprint` command used by the repository. Fingerprint is used only to decide whether a new native build is required. The app runtimeVersion remains the app version; never replace it with a fingerprint.
6. Choose the smallest valid operation: EAS Update for JS/assets-only changes; a new native build for native dependency, config-plugin, permission, SDK, or other binary changes. Record the exact EAS build ID or update/group ID and fingerprint.
7. For preview, verify the published preview update on the preview channel/profile with the Development API and exact commit. Where binary compatibility allows, republish that exact verified EAS Update group to Production. Runtime API selection must follow the installed update channel so the promoted bundle uses the Production API; do not bake a Preview-only API into a promotable JS bundle. Native changes require a production build.
8. For production native changes, create both Apple and Android builds, wait for both builds, and use the Production submit profile. Poll the real submission records to terminal status and record Apple App Store Connect and Google Play evidence separately; listing a submission is not proof it succeeded. One platform succeeding does not make the two-platform release complete. For rollback, identify the exact prior known-good build/update and target channel first; rollback only to that artifact and record the resulting ID.

## Evidence and handoff

Use [references/release-contract.md](references/release-contract.md) for the profile/command/evidence matrix. The final report must include target and authorization, commit, API environment, EAS profile/channel, app version/runtimeVersion, fingerprint and whether it required a native build, build/update IDs, verification commands/results, submit or promotion result, rollback point if relevant, and unresolved gates. Never label a local build, HTTP 200, or source-only check as a completed mobile release.
