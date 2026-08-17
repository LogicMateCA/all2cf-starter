---
title: "Starter release contract"
status: "verified-baseline"
source: "starter"
---

# Release

## Environments

- Generic “发布” or “deploy” means development only.
- “正式发布” or “production” is the explicit Production authorization. Do not request a second confirmation.
- Child workers cannot deploy or commit. Sol remains the high-level controller for release actions.
- Development release applies checksum-locked Development SQL migrations, runs the local workerd auth smoke suite, synchronizes Development Worker secrets, deploys, verifies public plus unauthorized protected routes, then repeats the full auth cycle at the Cloudflare edge including Secure Cookie attributes.
- Production release applies the same reviewed migration set to the Production database and uses a separate Production Better Auth secret. It remains gated by exact Development artifact parity and explicit Production wording.
- Worker secret sync includes Better Auth, Google OAuth, and only the selected email provider. CFsend is the default and requires Runtime URL/key/from; Resend requires key/from; Cloudflare Email Service creates its binding only when selected. Values remain local/remote secrets and are never written into Wrangler source.
- Development and Production both require verified email. Release must fail before deployment when the selected provider is incomplete; a local outbox row is not delivery evidence.

## Checklist

- [ ] Clean, identified commit and package/artifact recorded
- [ ] Change Spec and current Markdown/frontmatter source updated
- [ ] `/dp` regenerated from source and `knowledge:check` passed; live Development/Production release shows the exact released commit and Change Spec
- [ ] Relevant tests, build, migration, and route checks passed
- [ ] Cloudflare facts/operations checked through official MCP first
- [ ] Worker Studio capabilities detected where applicable
- [ ] Rollback and monitoring plan recorded

## Evidence

Report exact environment, identity, commands/checks, results, failures, and unverified gates. Never call a build or HTTP 200 alone a complete release validation.

## Baseline validation

- Cloudflare Development and Production deployment, identity read-back, PostgreSQL identity, artifact parity, and Development rollback are verified through the project scripts and official Cloudflare MCP.
- Expo local TypeScript, Doctor, iOS/Android export, API reachability, and fingerprint planning are verified.
- Expo remote Project binding, EAS Build/Update, installed-device E2E, App Store Connect, Google Play, and mobile rollback remain unverified and must not be represented as complete.
