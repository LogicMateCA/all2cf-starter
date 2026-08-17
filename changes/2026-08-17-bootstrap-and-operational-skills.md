---
id: bootstrap-and-operational-skills
title: Verified AI-first bootstrap and operational skills
status: development-verified
affectedModules: [mobile, docs]
docsImpact: [PROJECT.md, RELEASE.md, AGENTS.md, /dp]
---

# Outcome

A copied Starter can derive project identity from one configuration, materialize stable local environments, reject stale database identities and resource collisions, require a current official Cloudflare MCP snapshot, provision PostgreSQL/VPC/Hyperdrive idempotently, and release Development with evidence-backed skills.

# Scope

- Added verified `starter-bootstrap`, `cloudflare-release`, `expo-release`, and `runtime-upgrade` operational skills.
- Added transactional identity synchronization, provider/profile materialization, dependency policy, MCP preflight receipts, collision-safe provisioning, environment-specific Worker types, release history, and verified rollback.
- Added stale `/dp` detection, commit-level Change Spec coverage, compact AI onboarding context, and local-evidence/live-readback labeling.
- Parameterized Web, Worker, and Expo identities from project configuration while leaving visual templates intentionally undecided.

# Verification

- Identity reset rejected canonical names and propagated a noncanonical test identity across manifests, package scopes, PROJECT, bindings, and Maestro.
- Failed identity synchronization left earlier files unchanged; copied database URL mismatch and Docker/VPC/MCP collision cases failed closed.
- Environment materialization and infrastructure provisioning each ran twice with identical hashes and resource IDs.
- Repository verification, Expo Doctor 21/21, iOS/Android export, Cloudflare Development/Production release, official MCP read-back, and Development rollback passed.
- A deliberately stale `/dp` snapshot failed before synchronization; synchronization, Change Spec coverage, and compact AI context validation then passed.

# Release

- Cloudflare release and rollback baseline: commit `5f2074699b8cec46c791cecffc1afb026cd5ca0e`.
- Starter bootstrap Development release: commit `fa92b30ae39be60579496b9a02e00a70ff3b329f`, deployment `9d3aa6a0-47bc-41a2-8e2c-b4f7fd5f80b6`, version `b5cd7696-c84d-4e9c-8c1c-51b0cc5d4b18`.
- Expo remote EAS Project, installed-device E2E, store submission, and mobile rollback remain unverified.
