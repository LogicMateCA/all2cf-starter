---
name: project-context
description: Inspect, explain, synchronize, or repair the Starter's AI-readable project context, Change Specs, module documentation, architecture contracts, release evidence, and generated `/dp`. Use for “整体看项目”, “更新文档”, “更新 /dp”, “改完别让 AI 忘记”, “这个功能做到哪了”, onboarding another AI, or any material code/config/ownership change that must remain understandable after chat history is gone.
---

# Project context

Keep Markdown/frontmatter and machine-readable manifests authoritative. Generated `/dp` snapshots and local release state are derived evidence, never the source of architecture.

## Inspect

1. Read `AGENTS.md`, `PROJECT.md`, active files under `changes/`, affected `features/*/MODULE.md`, `starter.manifest.json`, `.ai/manifest.json`, `.ai/orchestration.yaml`, and applicable architecture/design/performance/release documents.
2. Run `npm run ai:context -- --json` in the project container. Treat `.all2cf` infrastructure/release data as a local evidence cache that requires live MCP read-back for current Cloudflare claims.
3. Map the requested behavior to owners, modules, routes, data, bindings, clients, docs, release lanes, and rollback. Do not infer an implemented or released status from a plan.

## Change contract

1. Create or update one focused `changes/<id>.md` from `changes/_template.md` for every material code, config, Skill, ownership, architecture, database, or release-policy change.
2. Keep its outcome, affected modules, docs impact, verification, release state, and unresolved gates current. Update affected module/root Markdown in the same change.
3. Run `npm run change:check`. The working tree and every commit after the configured baseline must pair material changes with a Change Spec in the same scope.

## Synchronize and verify

1. Run `npm run knowledge:check` before synchronization when diagnosing drift; a stale snapshot must fail.
2. Run `npm run knowledge:sync`, then `npm run knowledge:check` and `npm run ai:context -- --json`.
3. Verify the context reports the correct project/commit/dirty state, module statuses, environments, active changes, orchestration, recommended reads, evidence-cache warning, and explicit Dev/Production commit alignment. A project may have a production-released baseline while the current commit or dirty worktree is not released.
4. For a user-requested Development release, use `cloudflare-release`, then fetch `/dp/project.snapshot.json` and `/dp` from the live domain and verify the exact commit/change appears. Production still requires explicit Production intent.
5. Mark a Change Spec `development-verified` or `production-released` only after the corresponding live evidence exists. Never let generated JSON overwrite Markdown decisions.

Read [references/source-map.md](references/source-map.md) when deciding which source document owns a change.
