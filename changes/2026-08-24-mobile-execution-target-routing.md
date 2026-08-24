---
id: mobile-execution-target-routing
title: Route mobile work across EAS, local SDKs and a connected Mac
status: implemented
affectedModules: [mobile]
docsImpact: [features/mobile/MODULE.md, skills/expo-release/SKILL.md, skills/expo-release/references/release-contract.md]
---

# Outcome

Mobile planning reports which execution targets actually exist instead of assuming EAS Cloud or deciding from the host OS alone. It distinguishes EAS Cloud, local Xcode, local Android SDK and an optionally configured connected Mac.

# Scope

Add `mobile:targets`, include target routing in every mobile plan, and support a bounded connected-Mac SSH probe through `MOBILE_MAC_HOST`, `MOBILE_MAC_PROJECT_ROOT`, and optional `MOBILE_MAC_SSH_KEY_PATH`. The probe records only Darwin, Xcode and Git commit evidence. Remote release continues to require Expo project identity; a connected Mac never becomes fake store evidence.

# Verification

Require `mobile:targets:contract` to prove Linux/no-credential routing fails closed, Expo credentials select EAS Cloud, configured Mac values select connected Mac, and the live probe remains explicit. Run Expo dependency checks, Doctor, TypeScript, all-platform export, fingerprints, bundle budgets, AI/knowledge contracts and full repository verification.

# Release

Implemented and fully verified locally. Engine `2.0.0-dev.25` is the explicitly selected Development candidate. `mobile:targets:contract` passes no-credential, EAS and connected-Mac routing; the current Linux host truthfully reports both platforms unavailable, while Development planning records action `build`, Android fingerprint `417d10fcd2d125b1e609f365dc92fb341c987a8d` and iOS fingerprint `cb95ca245dd812a41a1777a05bd4a8c9600484e0`. Expo Doctor 21/21, all-platform export, budgets, knowledge synchronization and the complete repository verification pass. Stable, Production and all mobile stores remain unchanged.
