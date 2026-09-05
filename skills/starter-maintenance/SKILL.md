---
name: starter-maintenance
description: Inspect, add, diff, or update reusable capabilities in an existing Factory-generated Starter product. Use when a product has .starter/source.json and needs a Pack addition or source update; do not use for ordinary product-owned feature work.
---

# Starter maintenance

Generated products consume reusable source through `.starter/source.json`; they do not own local Pack templates.

## Inspect and change

1. Run `npm run starter:status` to compare the installed Engine/source commit and Pack versions with the available Channel. This reads the small descriptor and does not download or mutate the Engine.
2. Run `npm run starter:diff` before mutation. It is a plan and must not write files.
3. Add a reusable capability with `npm run starter:add -- <pack-id>`. Hard Pack dependencies are selected as a closure. Provider-dependent Packs still require their matching local `/setup` selection; do not invent Provider configuration.
4. Apply source updates with `npm run starter:update`. Review the Git diff afterward; the command updates the source receipt only after materialization succeeds.
5. A file whose current hash differs from its matching materialization receipt is product-modified. Update must stop rather than overwrite it. Resolve ownership deliberately and preserve product behavior.
6. Run `starter:diff` again, synchronize `/dp`, run task-scoped checks and commit the update as one reviewed product change.

Portable projects use the latest stable GitHub Release from `LogicMateCA/all2cf-starter`. The updater requires the named `starter-x.y.z.tar.gz` asset and GitHub-provided SHA-256 digest, bounds the download, rejects unsafe tar paths, and executes comparison locally. `STARTER_UPDATE_CHANNEL_URL` exists only for explicit loopback/HTTPS test fixtures.

No account, project Token, paid entitlement or All2CF connection is required. GitHub provides Base/Target provenance; local materialization remains authoritative for product-only preservation and simultaneous-change conflicts.

Adding or updating a Pack does not authorize database migration, Cloudflare provisioning, Development deployment, Production deployment, EAS update or App Store submission.
