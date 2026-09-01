---
name: starter-update-release
description: Check canonical Starter updates or publish a verified Starter Engine through All2CF. Use for “检查 Starter 更新”, “发布 Starter 开发版”, Engine/Channel/R2 publication, All2CF paid project updates, or Stable promotion; keep checks read-only, target Development by default, and require explicit Production or Stable wording.
---

# Starter update release

Own the complete path from canonical Starter source to an authorized generated-project update. Use repository scripts and recorded identities; do not reconstruct this workflow from chat memory.

Read [references/checkpoints.md](references/checkpoints.md) before building or publishing. Reuse completed checkpoints only when source commit, Engine version and Artifact SHA still match. Never rerun an expensive verified phase merely because a later external operation failed.

## Route by intent

### Check updates

Read `skills/runtime-upgrade/SKILL.md` and `skills/starter-source-release/SKILL.md`, then run in the Starter Node 24 `starter-dev` container. Never substitute the host runtime; stop and report if the project container is unavailable.

```bash
npm run source:status
npm run dependencies:check
npm run mobile:dependencies:check
```

This mode is source-read-only but may query npm/Expo registries. If the user also forbids network access, skip registry checks and report that latest-version evidence is unavailable. Report Git cleanliness, current Engine/Channel, Better Auth alignment, stable updates worth evaluating, Expo-owned compatibility holds, and prerelease pins. Do not edit versions, build an Engine, upload R2, advance a Channel, or deploy.

### Publish Development

Generic “发布” means Development. The controller must:

1. Start from clean `/opt/1panel/apps/starter`; explicitly choose the next Engine SemVer and preserve the rollback commit.
2. Use `runtime-upgrade` for dependency changes. Keep Better Auth packages aligned, Expo-owned versions compatible, and StyleKit snapshots owner-selected.
3. Commit one focused Change Spec and docs. Refresh `.starter/materialization.json` after changing a managed file, run `source:qualify` on the final clean tree during development, then run `source:release:candidate -- --version=<version>` in a clean isolated worktree with a dedicated dependency volume. Copy the exact matching ignored qualification receipt into that tree when the Git tree/lockfile/Node keys match; never rerun cold qualification merely because the commit history was normalized.
4. Require SQL-first and Drizzle portable verification, two reproducible archives, strict manifest checks and exact SHA-256. Also upgrade an isolated copy of the previous Stable project using that project's own lockfile and dedicated dependency volume. The proof must retain every pre-existing marketing path and customer Page/CSS marker, block an intentional functional conflict, and finish with the new receipt.
5. Record the candidate checkpoint before any remote mutation. Advance the local Development Channel with `source:publish:channel`; never replace an existing version with another hash.
6. Register the exact candidate into the current clean isolated All2CF release worktree selected from the live Production parent. Never target the dirty `/opt/1panel/apps/a2c` worktree and never revive a historical baseline path from this document.
7. In All2CF, update its Change Spec/adoption evidence, run TypeScript plus Starter v2/Runner/Agent Map/Change checks, and commit before remote mutation.
8. For database-backed Development commands, load `/opt/1panel/apps/a2c-dev/config/all2cf-updates-dev.env`; never inherit `DATABASE_URL` from `a2c-console-dev`. Confirm it resolves to database/user `a2cdev / a2cdev`. Use publisher identity `starter-updates-development@all2cf.local`.
9. Publish the exact Artifact with `starter-engine:publish:dev`; it must create/reuse private R2, upload, download again, verify SHA-256 and advance only the Development database Channel. The command must fail closed if the database identity is not `a2cdev / a2cdev`.
10. Deploy with `all2cf:deploy:dev`. The verified topology is:
   - Worker `a2c-web-dev`
   - hostname `a2capp-dev.example.com`
   - Hyperdrive `a2c-platform-dev-db`
   - PostgreSQL database/user `a2cdev / a2cdev`
    - R2 `a2c-starter-engine-artifacts`
11. Before accepting Runner health, compare the actual local `a2c-dev-tunnel` identity with Runner VPC Service `019fac2e-a8b8-7961-8fb0-806f64dc49c7`. It must target the current Tunnel, canonical hostname `a2c-dev-agent`, and HTTP port `8788`; redeploy the Worker after changing the Service target. Build the Development Agent from the same clean All2CF candidate and require its Docker health to pass.
12. Verify `/`, `/api/health`, `/api/version`, `/api/health/database`, unauthorized `resolve`, paid project-token `resolve`, one-use Artifact download and downloaded SHA-256. Run `starter-updates:verify:dev` with the same dedicated env file and require its cleanup result.
13. Run the authenticated Starter v2 API and browser proofs against Development. They must cover Better Auth sign-in and organization rotation, real Runner source generation, source SHA, Development Channel identity, unauthenticated `401`, missing-entitlement `402`, temporary paid entitlement, project Token issuance, tenant isolation, cleanup, desktop Applications/Maintain pages and 390px mobile overflow. Runner `/health` alone is transport evidence, never authorization or generation evidence.
14. For All2CF-managed generated-project Development releases, use an explicit `all2cf-control-plane` preflight snapshot derived from the saved Owner connection. Never label it MCP evidence. Require the same account/config hash/targets/collision/freshness gates and run `starterctl` only with `STARTER_CONTROL_PLANE=all2cf`. Local or product-owned AI releases continue to require official Cloudflare MCP first.

Official Cloudflare MCP inspection comes first. If Workers/R2 operations are unavailable there, record the limitation and use the pinned Wrangler commands through the saved All2CF connection.

## Production and Stable

Only explicit “正式发布”, “Production”, or “提升到 Stable” authorizes this path. Promote the exact Artifact already verified in Development; never rebuild it. Production/Stable automation is not considered proven until its own database, Stripe, Channel promotion, download and rollback drill have completed. If those gates are absent, stop without changing Production.

Stable publication must write the complete `packVersions` map from the Engine manifest and reject an empty or wrong-sized map. Public GitHub source, Docs and All2CF metadata must identify the same version before final readback. A generated project update advances the whole Engine/Catalog identity while materializing only selected functionality; Catalog-only Packs remain unloaded but are available at the new version.

Functional updates freeze existing product Pages, Page CSS and generated visual output. Auth, Providers, MCP, Codex plugin/Skills, Agent Map foundation, migrations, Runtime and selected functional modules remain updateable. Do not convert a page-level change into a whole-project conflict.

## Invariants

- GitHub is never the authoritative update source.
- All2CF owns entitlement, project token, Channel and private Artifact; local projects own diff and application and do not upload source.
- Check mode never implies mutation. Development never implies Stable or Production.
- Database migration, R2 upload, Channel advance and Worker deployment are distinct evidence gates.
- Report: Starter commit/version/hash, All2CF commit, Worker/version ID/domain, Hyperdrive database/user, R2 key, Channel, live checks, cleanup, and every unopened Production gate.
- On failure, classify it as source, dependency-volume, candidate, Core integration, database-owner migration, remote publication or live-proof failure; preserve the last matching checkpoint and resume there.
- Treat three to five minutes as the warm promotion target, not a cold-install promise. Report qualification, candidate, Development, public and Production elapsed times separately.
