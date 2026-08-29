---
id: stable-runtime-refresh
title: Refresh the stable Cloudflare, Web, and Expo patch lines
status: local-verified
affectedModules: [release, web, mobile]
docsImpact: [PROJECT.md, ARCHITECTURE.md, /dp]
---

# Outcome

Starter uses the newest reviewed stable releases on its existing Cloudflare, Web, and Expo compatibility lines, while keeping the Better Auth 1.7 data migration as a separate controlled change.

# Scope

- Refresh Wrangler, Workers types, Hono, Vite, the Vite React plugin, and Lucide to their current stable releases.
- Let Expo SDK 57 select compatible Expo module patch versions; do not independently move React or React Native outside the SDK 57 compatibility line.
- Preserve exact dependency pins and update the lockfile in the Node 24 project container.
- Record Better Auth 1.7 as a separate migration because it changes account identity and cannot be treated as a package-only refresh.

# Verification

- `expo install --check` reports the SDK 57 dependency line is current; Expo Doctor passed 21/21 checks.
- On 2026-08-21, Expo's current SDK 57 matrix advanced the compatible patch set to Expo/Router `57.0.15`, Updates `57.0.16`, Dev Client `57.0.14`, Linking `57.0.7`, Constants `57.0.13`, Metro Runtime `57.0.12`, and Fingerprint `0.20.9`; `expo install --fix` applied only those SDK-owned patches.
- The refreshed Mobile Web, iOS and Android exports passed at 387,293-byte Web gzip, 2,975,321-byte iOS Hermes, and 3,279,565-byte Android Hermes. Expo Doctor again passed 21/21.
- Mobile Web, iOS, and Android exports passed. Bundle checks passed at 386,624-byte Web gzip, 2,963,811-byte iOS Hermes, and 3,267,085-byte Android Hermes output. Development fingerprints now require a native Build.
- Full `npm run verify` passed in the Node 24 project container: knowledge/change checks, both Worker type generations/checks, all TypeScript projects, Vite production build, Web bundle budgets, and both Cloudflare dry-runs.
- The main Web bundle remains below budget at 64,371-byte gzip; the chart chunk is 103,812-byte gzip.
- Remote EAS builds, device E2E, and a real Development Worker publication were not run because this change has no release authorization.
- `npm audit` currently reports 15 non-critical transitive advisories under Expo/Metro (`image-size`, `uuid`, and their parents). npm's proposed automatic resolution downgrades Expo from SDK 57 to SDK 53, so it is rejected as incompatible; keep the SDK 57 line current and recheck on each Expo patch instead of forcing unsupported overrides.

# Release

Starting commit: `6075e783948740e6450ece1f1110d5357dde9137`. No deployment is authorized by this change. Development publication and MCP read-back remain required before this upgrade can be marked accepted; Production remains untouched.
