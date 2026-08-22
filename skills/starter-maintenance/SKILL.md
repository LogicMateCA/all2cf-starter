---
name: starter-maintenance
description: Inspect, add, diff, or update reusable capabilities in an existing Factory-generated Starter product. Use when a product has .starter/source.json and needs a Pack addition or source update; do not use for ordinary product-owned feature work.
---

# Starter maintenance

Generated products consume reusable source through `.starter/source.json`; they do not own local Pack templates.

## Inspect and change

1. Run `npm run starter:status` to compare the installed source commit and Pack versions with the available canonical source.
2. Run `npm run starter:diff` before mutation. It is a plan and must not write files.
3. Add a reusable capability with `npm run starter:add -- <pack-id>`. Hard Pack dependencies are selected as a closure. Provider-dependent Packs still require their matching local `/setup` selection; do not invent Provider configuration.
4. Apply source updates with `npm run starter:update`. Review the Git diff afterward; the command updates the source receipt only after materialization succeeds.
5. A file whose current hash differs from its matching materialization receipt is product-modified. Update must stop rather than overwrite it. Resolve ownership deliberately and preserve product behavior.
6. Run `starter:diff` again, synchronize `/dp`, run task-scoped checks and commit the update as one reviewed product change.

Adding or updating a Pack does not authorize database migration, Cloudflare provisioning, Development deployment, Production deployment, EAS update or App Store submission.
