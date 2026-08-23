---
title: "All2CF Starter Factory contract"
status: "local-engine-verified"
owner: "assembler"
---

# All2CF Starter Factory

The local deterministic engine is the implementation source for a future All2CF customer feature. All2CF must wrap the same Blueprint and lifecycle engine; it must not implement a second template generator in an API route.

## Service boundary

Hosted generation is asynchronous:

`validated Blueprint` → `generation job` → `isolated workspace` → `Factory engine` → `verification` → `portable artifact` → optional delivery

An HTTP or MCP request creates or inspects a job. It does not run dependency installation, builds, GitHub writes, Cloudflare deployment or App submission inside the request lifecycle.

## Proposed typed tools

- `starter_catalog`: return selectable executable capabilities and the current source version.
- `starter_plan`: validate a Blueprint and return selected Packs, dependency closure, files, dependencies, migrations, bindings and unresolved Provider requirements without writing.
- `starter_generate`: create an idempotent generation job from a validated Blueprint and requested delivery modes.
- `starter_job_status`: return phase, exact source commit, artifact hash, verification evidence and failure details.
- `starter_project_status`: compare a generated project's source/Pack receipts with a requested source version.
- `starter_project_diff`: return an update plan and ownership conflicts without writing.
- `starter_project_add`: create a reviewed change job for one Pack plus dependency closure.
- `starter_project_update`: create a reviewed source-update job; receipt-owned product changes must stop automatic application.

GitHub repository creation, Cloudflare Development provisioning, EAS builds and App Store submissions are separate delivery/release tools. Their existing authorization boundaries remain unchanged; generation alone authorizes none of them.

## Idempotency and evidence

A generation identity is the hash of the normalized Blueprint, immutable source commit and engine version. Repeating that identity returns the same completed artifact or active job rather than creating another project. Every completed result records the source commit, Blueprint hash, materialization receipt, generated Git commit, archive hash, verification gates and unresolved external Provider evidence.

All2CF executes a SHA-256-verified Git archive without `.git` history and injects its manifest's exact commit through `STARTER_FACTORY_SOURCE_COMMIT`. Normal local Factory execution still derives identity and dirty state from Git; the capsule override is only for an already verified immutable source artifact.

All2CF also sets `STARTER_FACTORY_PORTABLE=true`. Portable output removes canonical account, zone, domain and database-host topology, uses non-routable `example.invalid` identities, and leaves the generated product's local `/setup` responsible for binding customer infrastructure later.

Portable output receives an exact source URL plus a stable Engine Channel URL, Engine version and Artifact SHA-256. Its `starter-source/v2` receipt sets `sourceRoot: null` and `updateMode: engine-channel`; it never serializes the temporary Runner extraction path. Local linked-source projects retain their real source root and direct lifecycle commands.

The capsule generation hot path has no project `node_modules`. It uses Node-only identity and knowledge parsing. When an optional Pack changes dependencies, All2CF sets `STARTER_FACTORY_PACKAGE_LOCK_ONLY=true` so npm resolves the exact lockfile without installing the dependency tree; full installation remains an optional Verify job.

## Canonical source release

The canonical Starter owns the Engine candidate before any consumer can advertise it. `source:status` is a fast clean-source, candidate and Channel evidence check. `source:release:candidate -- --version=<version>` runs canonical verification, fully installs and verifies generated SQL and Drizzle portable projects, creates the exact Git archive twice, rejects unequal SHA-256 hashes, and emits an ignored candidate bundle under `.all2cf/engine-candidates/<version>/`. `source:publish:channel -- --version=<version> --channel=development` then retains the versioned Artifact and manifest and atomically advances only `channel.json`; downgrades and same-version hash replacement fail closed.

Generated products use `starter:status` to read only the Channel descriptor. `starter:diff`, `starter:add` and `starter:update` download the exact same-origin Artifact, enforce a 96 MiB bound, verify SHA-256, reject unsafe tar paths and execute the Artifact's Factory against the product. The product source receipt advances only after successful materialization. Receipt-owned product changes remain protected and stop the update.

The strict `factory-engine.json` remains the only manifest consumed by All2CF. `registration.json` describes the capsule and target paths plus required post-registration checks. `engine:register` defaults to a read-only plan, refuses dirty All2CF targets and requires an explicit `--apply` in an integration-owned clean worktree. Registration never commits, merges, deploys or removes a previous capsule.

StyleKit is not an upstream auto-update channel. Engine candidates carry the current Starter-owned curated snapshots. A deliberate visual change must update the owned snapshot, adapters, contracts and visual evidence before the next source candidate.

## Current evidence

Local directory generation, portable archive creation, project-specific Git/AI handoff, SQL/Drizzle verification, hosted Runner generation/verification, private GitHub delivery contracts, local and Engine-Channel status/diff, Pack addition with dependency closure, idempotent update and receipt-owned conflict refusal are verified. Remote All2CF MCP tools and any Development or Production deployment remain separate gates.
