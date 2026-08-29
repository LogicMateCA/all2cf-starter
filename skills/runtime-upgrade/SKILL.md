---
name: runtime-upgrade
description: Inspect and upgrade Starter dependencies to current stable, compatible releases. Use for “升级版本”, “用最新版”, dependency maintenance, Expo SDK upgrades, Wrangler/React/Vite/Hono/PostgreSQL client upgrades, or Better Auth and plugin upgrades; enforce Expo compatibility, aligned Better Auth packages and schema review, full repository verification, a real Development deployment, and explicit Production authorization.
---

# Runtime upgrade

Read `dependency-policy.json`, then run `npm run dependencies:check` in the project container. Use official release notes and compatibility documentation before editing versions.

## Selection rules

- Prefer the newest stable release that belongs to the active compatibility line.
- Never use beta, canary, nightly, or `next` in the reusable Starter unless explicitly requested for an experiment.
- Treat Expo SDK as the owner of React Native, React, Expo Router, and Expo module compatibility. Run `npm run mobile:dependencies:check` from the root; it executes Expo's check in `apps/mobile`. Do not replace an Expo-compatible package with npm `latest` independently.
- Keep `better-auth`, `auth`, and every directly installed `@better-auth/*` plugin on the same stable release line. Check the official migration notes and security notices before updating.
- Keep Node type definitions on the Node runtime major used by the container.

## Upgrade workflow

1. Require a clean starting commit and record current versions and rollback commit.
2. Run `npm run dependencies:check` and inspect official changelogs for every changed runtime family.
3. Update exact versions and the lockfile in the container. Avoid broad `npm audit fix --force` or framework downgrades.
4. For Expo changes, run `npm run mobile:dependencies:check`, Expo Doctor, TypeScript, both platform exports, fingerprints, and the real mobile release workflow when remote credentials are configured.
5. For Better Auth changes, run `npx auth@latest upgrade` only after reviewing its proposed changes. Generate SQL, review it, apply it to Development, and verify sign-up, sign-in, sign-out, session refresh, OAuth, Admin, Stripe checkout, signed webhook handling, and entitlement changes. Do not migrate Production as part of an ordinary dependency check.
6. Run `npm run verify` and all feature-specific tests. Commit the upgrade intentionally.
7. Use `cloudflare-release` to publish and verify Development. Production still requires explicit Production intent and exact verified artifact parity.
8. Update `/dp` source documents with the selected versions, compatibility reason, validation evidence, and remaining gates.

Read [references/acceptance-matrix.md](references/acceptance-matrix.md) for runtime-specific acceptance requirements.
