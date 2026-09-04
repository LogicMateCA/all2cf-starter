---
name: starter-source-release
description: Build, verify, check, or register an immutable All2CF Starter Factory Engine candidate from the canonical Starter source. Use for Starter source releases and customer-update baselines; do not use for Cloudflare deployment or generated-project maintenance.
---

# Starter source release

This Skill owns the boundary from one clean canonical Starter commit to an immutable, reproducible All2CF Engine candidate. It never deploys a Worker, publishes an App, merges a customer update, or treats a dirty worktree as a candidate.

## Status and policy

1. Work only in `/opt/1panel/apps/starter` or an explicitly identified canonical Starter worktree.
2. Run `npm run source:status` first. Stop release-candidate work when the source is dirty.
3. Starter releases contain no visual catalog or visual profile. Visual changes belong to the independent Visual Design plugin and require their own project-level acceptance evidence.
4. Better Auth/runtime dependency upgrades remain owned by `runtime-upgrade`; do not hide dependency changes inside an Engine release.

## Candidate

1. Create and commit one focused Change Spec plus all affected canonical Markdown before verification.
2. Choose the next reviewed Engine SemVer explicitly. Never infer or silently increment it.
3. During normal development, run `npm run source:qualify` once on the final clean tree. The ignored qualification receipt is reusable only for the exact Git tree, lockfile SHA-256 and Node version.
4. Run `npm run source:release:candidate -- --version=<version>` in `starter-dev`. Use `--force-qualification` when a clean full rerun is explicitly required.
5. The command must reuse only an exact qualification, generate and fully verify clean SQL, Drizzle and minimal portable projects concurrently, build the exact Git archive twice, require equal SHA-256 hashes, and check the strict Engine manifest and registration bundle.
6. Inspect `.all2cf/engine-candidates/<version>/candidate-report.json`, `source-verification.json`, `factory-engine.json`, `registration.json`, and the capsule. This directory is local ignored evidence, not source.

## Registration

1. `npm run engine:register -- --version=<version>` is a read-only registration plan.
2. A target plan may use `--target=<clean-All2CF-integration-worktree>`. It must refuse a dirty target.
3. Only the owning All2CF integration controller may add `--apply`. The command copies the new capsule and strict manifest and writes an ignored registration receipt; it does not delete the previous capsule, commit, merge, build, deploy or publish.
4. The All2CF task must update its own Change Spec/docs, run typecheck, Runner SQL/Drizzle generation, API/browser verification and commit the integration separately.
5. All2CF-hosted customer update availability begins only after the new Engine is integrated into All2CF. A locally published Channel is verification evidence only. Production or Development deployment still requires its separate explicit authorization.

## Channel publication

1. After `engine:check`, run `npm run source:publish:channel -- --version=<version> --channel=development`. The ignored local default is `.all2cf/engine-channels/<channel>`; use `--target=<channel-directory>` only for an explicit external publication root.
2. Publication retains versioned Artifacts and manifests and atomically replaces only `channel.json`.
3. It must refuse downgrade and same-version Artifact hash replacement. Re-publishing the exact same version and hash is idempotent.
4. Local Channel publication proves the update mechanism but does not integrate All2CF or authorize deployment. All2CF may later serve the same descriptor and immutable files without changing the project maintenance contract.

## Evidence

Report the Starter commit, Engine version, capsule SHA-256, two-build reproducibility result, SQL/Drizzle generated commits and archive hashes, verification completion time, Channel target/previous version, registration target/receipt if applied, and every unverified external gate.
