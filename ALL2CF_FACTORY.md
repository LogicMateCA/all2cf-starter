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

The capsule generation hot path has no project `node_modules`. It uses Node-only identity and knowledge parsing. When an optional Pack changes dependencies, All2CF sets `STARTER_FACTORY_PACKAGE_LOCK_ONLY=true` so npm resolves the exact lockfile without installing the dependency tree; full installation remains an optional Verify job.

## Current evidence

Local directory generation, portable archive creation, project-specific Git/AI handoff, status/diff, Pack addition with dependency closure, idempotent update and receipt-owned conflict refusal are verified. Hosted jobs, artifact storage, GitHub delivery and remote All2CF MCP tools remain planned until exercised against their real systems.
