---
id: expo-sdk57-patch-alignment
title: Align mobile dependencies with the current Expo SDK 57 patch matrix
status: implemented
affectedModules: [mobile]
docsImpact: [features/mobile/MODULE.md, dependency-policy.json]
---

# Outcome

Align the Expo-owned mobile dependency family with the current stable SDK 57 compatibility matrix reported by Expo Doctor. This is a patch-only compatibility update; React, React Native, Tamagui and Better Auth remain on their already verified lines.

# Scope

Update only Expo, Expo Router, Expo runtime modules, `@expo/fingerprint`, and the optional Expo Notifications Pack to the SDK 57 versions selected by Expo Doctor and `expo install`. Preserve all EAS profiles, app identifiers, runtimeVersion policy, API environment routing and store authorization rules.

# Verification

Require `expo install --check`, Expo Doctor, mobile TypeScript, Android/iOS/Web export, mobile bundle budgets, both native fingerprints, Agent Map, knowledge synchronization and Change Spec checks. Remote EAS Build requires a configured Expo project and token; local verification must not pretend remote build or store submission occurred.

# Release

Implemented and fully verified locally. Expo dependency check reports up to date, Expo Doctor passes 21/21, iOS/Android/Web export and mobile budgets pass, and the Development plan records native fingerprints Android `417d10fcd2d125b1e609f365dc92fb341c987a8d` and iOS `cb95ca245dd812a41a1777a05bd4a8c9600484e0` with action `build`. The complete repository `verify` gate, both Worker dry-runs, Factory, update, Plugin, Visual, design and AI contracts pass.

Development remote EAS Build remains unavailable because neither `EXPO_TOKEN` nor `EXPO_PROJECT_ID` is configured and no connected Mac address is registered. Preview, Production, App Store and Google Play are not authorized or claimed by this change.
