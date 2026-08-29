---
name: all2cf-starter-update
description: Check, preview, add or apply authorized Starter Engine and Pack updates in a generated All2CF project. Do not build or publish the canonical Engine.
---

# All2CF Starter update

Require `.starter/source.json`. Open the local `/maintenance` page first and report whether the project is independent or connected. `/all2cf` and `/update` are compatibility aliases.

When disconnected, inspect the available All2CF MCP tools instead of guessing tool names. Use hosted All2CF MCP OAuth to identify the project, verify ownership and paid entitlement, and request a project-scoped connection receipt. Save that receipt to a private temporary path, run `npm run all2cf:connect -- <receipt-path>`, remove the temporary file, reload `/maintenance`, and verify `npm run all2cf:status`. Never print the project Token. If MCP is unavailable, direct the user to import the same All2CF-issued receipt in `/maintenance`; do not fabricate authorization or fall back to GitHub.

All native Cloudflare inventory and mutations remain owned by official Cloudflare MCP. All2CF MCP is limited to project identity, entitlement, receipts and authorized Starter updates.

Use `npm run starter:status` for checks and `npm run starter:diff` for previews. These operations must not modify files. Resolve server-side entitlement before presenting a paid capability as available.

Only run `starter:add` or `starter:update` after the user requests the update. Preserve product-owned changes, fail on collisions, use the All2CF service and receipt recorded in `.starter/source.json`, and never fall back to a public GitHub repository as the commercial update authority. After applying, run the project verification gates and report the exact previous/new Engine receipt plus remaining conflicts.

Source candidate builds, Artifact registration, R2 upload and Channel advancement belong to the canonical Starter repository and are excluded.
