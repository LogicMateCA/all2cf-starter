# Expo release contract

The target is selected from the user's words, not from the current branch or a default profile. Generic mobile release/build/update means development; `preview` means preview; only `正式发布移动端` or `production` means production.

| Target | Profile/channel | Normal operation | Required evidence |
| --- | --- | --- | --- |
| development | `development` / project development channel | Use the existing root and `apps/mobile` scripts; EAS Update for JS/assets-only changes, otherwise EAS development build | Clean commit; API environment/base URL; app version/runtimeVersion; fingerprint; verification results; EAS update/build ID |
| preview | `preview` / preview channel | Verify a preview EAS Update or build; promote the exact verified update bundle when it is binary-compatible | All development evidence plus preview profile/channel, device/E2E result, update/group ID, and promotion mapping |
| production | `production` / production channel | JS/assets-only: promote the exact verified preview update where compatible; native change: production EAS builds and submits | Explicit production authorization; clean commit; production API environment; runtimeVersion/fingerprint; update/build IDs; separate Apple and Android submission evidence |
| rollback | The affected target channel | Point the channel to the exact prior known-good build/update | Prior artifact ID and commit; target channel; reason; resulting channel/artifact ID; smoke/E2E result |

## Command sources

- Inspect `apps/mobile/package.json` and invoke its existing scripts for lint, typecheck, unit/E2E, and app verification. Do not copy their implementation into this skill.
- Inspect `apps/mobile/eas.json` and Expo config before choosing a profile or channel. Use the repository's configured EAS commands and flags.
- In this Starter repository, use root orchestration only when applicable: `npm run starter:provision`, `npm run release:dev`, `npm run release:production`, and the root `verify` checks. These do not replace mobile verification.
- If a required script, profile, environment, or EAS capability is absent, report the missing gate instead of inventing a command or silently changing scope.

## Identity rules

Record this tuple for every artifact: `commit + API environment + EAS profile/channel + app version/runtimeVersion + native fingerprint + build/update ID`. Fingerprint answers only “does this need a native build?”; `runtimeVersion` remains the app version. A production promotion must point to the same verified update group, and runtime API routing must resolve from the installed channel so that group cannot keep the Preview API in Production.
