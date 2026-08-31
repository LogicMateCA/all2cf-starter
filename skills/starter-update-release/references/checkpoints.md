# Starter release checkpoints

Every checkpoint is keyed by `{sourceCommit, engineVersion, artifactSha256}`.
Discard it when any identity changes.

## Source checkpoint

- Clean isolated worktree and dedicated Node 24 dependency volume.
- Managed-file receipt refreshed.
- Change Spec, Changelog and docs committed together.

## Candidate checkpoint

- SQL-first, Drizzle, Website and Mobile generation passed.
- Functional update safety passed: customer files/dependencies preserved,
  page layer frozen, true conflicts blocked, recovery snapshot restored.
- An isolated previous-Stable project used its own lockfile/dependency volume;
  every pre-existing marketing path and customer Page/CSS marker survived the
  applied update, while an intentional functional conflict was blocked.
- Two archive builds produced the same Artifact SHA.

## Development checkpoint

- R2 readback and Development Channel match the candidate.
- Channel contains the full Pack version map.
- Worker, Runner, OAuth, MCP, paid resolve, one-use download and cleanup pass.

## Public checkpoint

- Neutral public source reports `optionalPackCount=0` and leak count zero.
- GitHub tag/Release assets and Docs identify the same Engine.
- Downloaded public assets match recorded SHA values.

## Production checkpoint

- Exact Development Artifact promoted without rebuild.
- Owner-only database migration has a schema backup and exact diff.
- Production health, OAuth, entitlement, one-use download, disconnect and
  cleanup pass.
- Stable row contains the full Pack map; rollback Worker/Core/Stable identities
  are recorded.

## Recovery

- Broken dependency volume: create a new isolated volume; do not repair a
  half-installed `node_modules` tree.
- Candidate failed after source change: rebuild; never reuse the old SHA.
- Core/remote failure with unchanged candidate: resume from Development or
  Production checkpoint without rebuilding the Engine.
- Test fixture drift: repair fixture cleanup and rerun the affected gate; do
  not weaken the product invariant.
