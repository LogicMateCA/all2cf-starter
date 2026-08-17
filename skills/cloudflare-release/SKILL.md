---
name: cloudflare-release
description: Build, verify, deploy, inspect, or roll back this Starter application's Cloudflare Workers. Use for Cloudflare release operations and requests such as “构建”, “发布”, “deploy”, “正式发布”, or “production”; use the repository release scripts, target Development by default, require explicit Production wording, and report the exact commit, artifact hash, Worker, domain, deployment/version IDs, bindings, and live route checks.
---

# Cloudflare release

Use this skill for the complete Web and Worker release lifecycle. Treat repository scripts and release state as the operational implementation; do not recreate them as ad-hoc Wrangler commands.

## Target rules

- “构建”, “build”, or verification alone does not authorize a remote deployment.
- Generic “发布”, “deploy”, or “release” targets **Development** immediately after required checks.
- Only explicit “正式发布” or “production” targets **Production**. The explicit phrase is the authorization; do not ask for another confirmation.
- Production must use the exact artifact already released and verified in Development.

## Required workflow

1. Read `AGENTS.md`, `PROJECT.md`, `starter.config.json`, `.ai/manifest.json`, both Wrangler configs, and `.all2cf/state.local.json` when it exists. Run `npm run ai:context -- --json` and inspect Git status before deciding the operation.
2. Run Cloudflare facts and operational inspection through the official Cloudflare MCP first. Detect Worker Studio MCP tools at runtime and use them when relevant; never assume they exist. If the official MCP is unavailable, record that limitation before using Wrangler or the Cloudflare API as the evidence source.
3. Run all repository commands in the project container. Use `npm run verify` for a build-only request. Use `npm run release:dev` for Development and `npm run release:production` for Production. Do not bypass the clean-worktree, verification, artifact-parity, or live-route gates in `scripts/starterctl.mjs`.
4. After deployment, read back the Worker, custom domain, bindings, latest deployment/version, and route health. Validate `/`, `/dp`, `/api/health`, and `/api/health/database`; HTTP 200 alone is not enough when the response identity or database environment conflicts with the target.
5. Record the release tuple: `commit + artifact hash + environment + Worker + domain + deployment/version IDs + bindings + live checks`. Never call a dry run, upload, or local build a completed release.
6. For rollback, identify the exact known-good version and current traffic state first. Change traffic only when rollback is explicitly requested, then verify and record the resulting deployment.

## Provisioning boundary

`npm run starter:provision` creates or reconciles database and Cloudflare connectivity resources. Provisioning is not part of an ordinary release. Run it only for initial setup or an explicit infrastructure reconciliation, and inspect its target identities before it changes state.

Use [references/release-contract.md](references/release-contract.md) for the command and evidence matrix.
