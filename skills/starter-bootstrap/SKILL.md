---
name: starter-bootstrap
description: Initialize a copied Cloudflare AI Starter with a new project identity, shared provider profile, project-local secrets, PostgreSQL databases, VPC connectivity, Hyperdrive bindings, Wrangler configs, Development Worker, and verified `/dp`. Use for “复制 Starter”, “创建新项目”, “初始化项目”, “改项目名/域名”, or “配置 dev/prod 基础设施”; require exact identities, official Cloudflare MCP preflight/read-back, idempotency evidence, and Development-only release unless Production is explicit.
---

# Starter bootstrap

When `.starter/source.json` exists, the project came from the deterministic Factory. Verify its source commit, generation report, clean initial Git commit, `/setup` entry, and `starter:status`/`starter:diff` before provisioning. Do not repeat identity reset unless the owner is deliberately renaming the generated project. A legacy manual copy without a source receipt follows the identity phase below.

Use the always-running `starter-dev` container for Setup, materialization and normal verification. Invoke `starter-ops` through the explicit Compose `ops` profile only for scoped infrastructure provisioning; do not add Docker or Production mounts back to the Setup service.

Use repository scripts for deterministic work and keep project identity decisions in Markdown/JSON source files. Do not copy the canonical Starter's release claims into a new product unchanged.

## Identity phase

1. Read `AGENTS.md`, `PROJECT.md`, `starter.config.json`, `starter.manifest.json`, `.ai/manifest.json`, `cloudflare/bindings.contract.json`, and both Wrangler configs.
2. Resolve the new product name, slug, Development/Production Worker names and domains, Development/Production PostgreSQL database and role names, local port/container, VPC Service name, and Hyperdrive names. Put them in `starter.config.json`. Stop if any identity is still a neutral placeholder or unintentionally points to canonical `starter` resources.
3. Run `npm run identity:sync -- --reset`. It must reject canonical Starter identities. Inspect its transactional diff: it updates AI/Starter manifests, binding environment names, package scopes, PROJECT title, and the Preview Maestro App ID from the single configuration source. Wrangler files are generated later by provision. Historical `.all2cf/*.local.json` files are local evidence and must not be copied.
4. Inspect the target Cloudflare account through official Cloudflare MCP before mutation. Detect Worker Studio MCP capabilities at runtime; record unavailable capabilities instead of inventing tools. Save the normalized MCP result as ignored `.all2cf/cloudflare-preflight-snapshot.local.json`, with exact targets, statuses, IDs, config hash, account, timestamp, and Worker Studio state. Run `npm run cf:preflight:record -- --snapshot .all2cf/cloudflare-preflight-snapshot.local.json`. The validator derives collisions from the snapshot; its configuration-bound receipt expires after 30 minutes.

## Environment and infrastructure phase

1. Work inside the project container. Run `npm install` after identity sync, and ensure the shared provider profile is mounted read-only at the configured path.
2. Run `npm run env:materialize:dev` twice. Hash `.dev.vars`, `apps/web/.env.local`, and `apps/mobile/.env.local`; the second run must be identical. Existing project database URLs and generated secrets must be preserved.
3. Run `npm run credentials:doctor`. Cloudflare and PostgreSQL are required for the base bootstrap. Optional providers report `not-configured` without blocking unrelated modules.
4. Run `npm run starter:provision` twice while the MCP receipt is current. Compare PostgreSQL identities, VPC Service ID, both Hyperdrive IDs, bindings, domains, and tracked Wrangler diffs. A second run must reconcile the same resources rather than create duplicates.
5. Read back Cloudflare resources with official MCP and verify the Development PostgreSQL container is healthy with TLS enabled. Verify Production identity only through the configured remote path; do not expose credentials.

## Acceptance and handoff

1. Run `npm run verify`, `npm run mobile:dependencies:check`, and `npm run mobile:verify` when the mobile application is included.
2. Update Markdown/frontmatter and `/dp`, then create one intentional initial commit.
3. Use `cloudflare-release` for the initial Development deployment and live identity checks. Bootstrap does not authorize Production; only explicit “正式发布” or `production` does.
4. Record the exact commit, generated-file hashes, database identities, VPC/Hyperdrive IDs, Worker/domain, Development deployment/version, live checks, optional-provider status, and unresolved gates.

Read [references/identity-and-evidence.md](references/identity-and-evidence.md) before changing a copied project's names or provisioning resources.
