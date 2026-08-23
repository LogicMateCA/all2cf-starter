---
name: all2cf-starter-update
description: Check, preview, add or apply authorized Starter Engine and Pack updates in a generated All2CF project. Do not build or publish the canonical Engine.
---

# All2CF Starter update

Require `.starter/source.json`. Use `npm run starter:status` for checks and `npm run starter:diff` for previews. These operations must not modify files.

Only run `starter:add` or `starter:update` after the user requests the update. Preserve product-owned changes, fail on collisions, use the All2CF service and receipt recorded in `.starter/source.json`, and never fall back to a public GitHub repository as the commercial update authority. After applying, run the project verification gates and report the exact previous/new Engine receipt plus remaining conflicts.

Source candidate builds, Artifact registration, R2 upload and Channel advancement belong to the canonical Starter repository and are excluded.
