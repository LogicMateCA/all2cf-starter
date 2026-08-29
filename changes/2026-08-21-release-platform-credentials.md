---
id: release-platform-credentials
title: Add local release-platform credential setup and verification
status: local-verified
affectedModules: [assembler, mobile, docs]
docsImpact: [PROJECT.md, features/assembler/MODULE.md, features/mobile/MODULE.md, features/docs/MODULE.md, catalog/providers.json, /setup, /dp]
---

# Outcome

Local `/setup` can preserve, replace and test the credentials used by Cloudflare, GitHub, Expo/EAS, App Store Connect and Google Play release tooling without exposing existing values or mutating a release target.

# Scope

- Add write-only project/shared readiness for each release platform and official application/configuration links.
- Add read-only tests: exact Cloudflare account/token verification, GitHub authenticated identity, EAS exact project resolution, App Store Connect exact app lookup and Google Play exact package read.
- Keep release credentials out of deployed Worker variables. Non-empty replacements are written only to ignored project-local `.dev.vars`; configure-later stays a visible readiness gap.
- Add `CLOUDFLARE_ACCOUNT_ID`, `EXPO_OWNER` and `GOOGLE_PLAY_PACKAGE_NAME` to the corresponding complete credential groups.

# Verification

- Web/Worker/Mobile/Astro typecheck passes.
- Setup browser acceptance passed all 4 cases with 8 screenshots and artifact SHA `7e40515eedcf4c7bc9743cf785126928a500ebf94e547b10c68d4fc675ed7ba1`.
- The live configured Cloudflare account token and exact account lookup passed through the new local Setup endpoint.
- GitHub, EAS, App Store Connect and Google Play returned truthful missing-credential results in this project; their real account tests remain pending until those optional values are configured.
- Cloudflare MCP and Worker Studio MCP tools were unavailable in this session. Official provider endpoints and the pinned EAS CLI were used.

# Release

No Worker or mobile release. These checks validate release identities only; `发布` and explicit mobile/Production commands still own build, deploy, submit and rollback evidence.
