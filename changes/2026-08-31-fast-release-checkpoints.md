---
id: fast-release-checkpoints
title: Separate cold qualification from fast exact promotion
status: implemented
affectedModules: [assembler, operations]
docsImpact: [skills/starter-source-release/SKILL.md, skills/starter-update-release/SKILL.md]
---

# Outcome

Canonical release work now has two explicit lanes. Qualification receipts use the existing ignored `.all2cf/*local.json` evidence boundary so recording proof never makes the source dirty.

- Cold qualification runs the complete source verification once during normal development and writes an ignored receipt keyed by Git tree, lockfile SHA-256 and Node version.
- Fast candidate/promotion reuses that receipt only when every key matches, then runs SQL-first, Drizzle and minimal portable-project proofs concurrently before creating the immutable Artifact.

A commit SHA difference alone does not invalidate a qualification when its full Git tree, lockfile and toolchain are identical. Any source-tree, lockfile or Node-version difference forces a cold qualification. `--force-qualification` also forces the complete gate.

This moves expensive generic verification out of the publish click while preserving exact evidence. Remote R2, Worker, Runner, GitHub, Docs, Production and Stable stages continue from the candidate checkpoint and never rebuild or requalify an unchanged Artifact.

# Performance target

- Warm candidate plus Development/Production promotion targets three to five minutes when Cloudflare and GitHub APIs respond normally.
- Cold qualification is intentionally outside that target and may take longer because it installs and verifies every selected runtime.
- Every receipt records elapsed time so regressions are visible instead of hidden behind one total duration.

# Verification

- `release:checkpoint:contract` checks exact tree/lockfile/Node matching, forced qualification and concurrent portable proofs.
- The 2.1.11 release rehearsal must run cold qualification once, then demonstrate a warm candidate that reports `qualification.reused=true`.
