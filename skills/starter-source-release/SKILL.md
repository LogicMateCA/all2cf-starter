---
name: starter-source-release
description: Build, verify, check, or register an immutable All2CF Starter Factory Engine candidate from the canonical Starter source. Use for Starter source releases and customer-update baselines; do not use for Cloudflare deployment or generated-project maintenance.
---

# Starter source release

This Skill owns the boundary from one clean canonical Starter commit to an immutable, reproducible All2CF Engine candidate. It never deploys a Worker, publishes an App, merges a customer update, or treats a dirty worktree as a candidate.

## Status and policy

1. Work only in `/opt/1panel/apps/starter` or an explicitly identified canonical Starter worktree.
2. Run `npm run source:status` first. Stop release-candidate work when the source is dirty.
3. StyleKit uses Starter-owned curated snapshots. Do not automatically fetch, merge or version-bump upstream StyleKit. Visual changes require an explicit owner-selected snapshot change and their own visual acceptance.
4. Better Auth/runtime dependency upgrades remain owned by `runtime-upgrade`; do not hide dependency changes inside an Engine release.

## Candidate

1. Create and commit one focused Change Spec plus all affected canonical Markdown before verification.
2. Choose the next reviewed Engine SemVer explicitly. Never infer or silently increment it.
3. Run `npm run source:release:candidate -- --version=<version>` in `starter-dev`.
4. The command must run canonical verification, generate and fully verify clean SQL and Drizzle portable projects, build the exact Git archive twice, require equal SHA-256 hashes, and check the strict Engine manifest and registration bundle.
5. Inspect `.all2cf/engine-candidates/<version>/candidate-report.json`, `source-verification.json`, `factory-engine.json`, `registration.json`, and the capsule. This directory is local ignored evidence, not source.

## Registration

1. `npm run engine:register -- --version=<version>` is a read-only registration plan.
2. A target plan may use `--target=<clean-All2CF-integration-worktree>`. It must refuse a dirty target.
3. Only the owning All2CF integration controller may add `--apply`. The command copies the new capsule and strict manifest and writes an ignored registration receipt; it does not delete the previous capsule, commit, merge, build, deploy or publish.
4. The All2CF task must update its own Change Spec/docs, run typecheck, Runner SQL/Drizzle generation, API/browser verification and commit the integration separately.
5. Customer update availability begins only after the new Engine is integrated into All2CF. Production or Development deployment still requires its separate explicit authorization.

## Evidence

Report the Starter commit, Engine version, capsule SHA-256, two-build reproducibility result, SQL/Drizzle generated commits and archive hashes, verification completion time, registration target/receipt if applied, and every unverified external gate.
