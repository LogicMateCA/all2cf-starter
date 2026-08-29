---
name: all2cf-starter-update
description: Check, preview, add or apply authorized Starter Engine and Pack updates in a generated All2CF project. Do not build or publish the canonical Engine.
---

# All2CF Starter update

Require `.starter/source.json`. Open the local `/maintenance` page first and report whether the project is independent or connected. `/all2cf` and `/update` are compatibility aliases.

When disconnected, use the `Connect All2CF MCP` action on local `/maintenance`. It creates PKCE/state locally, opens All2CF OAuth, verifies project ownership and paid entitlement, exchanges the one-use code through the local development service, stores the ignored project Receipt, and returns to `/maintenance`. If authentication needs user interaction, ask the user to finish sign-in in that browser; never ask them to copy a Prompt or Token. Verify `npm run all2cf:status` after the callback. Manual Receipt import is Advanced recovery only; do not fabricate authorization or fall back to GitHub.

All native Cloudflare inventory and mutations remain owned by official Cloudflare MCP. All2CF MCP is limited to project identity, entitlement, receipts and authorized Starter updates.

Use `npm run starter:status` for checks and `npm run starter:diff` for previews. These operations must not modify files. Resolve server-side entitlement before presenting a paid capability as available.

Read the diff summary as Safe, Customer changes kept and Conflicts. Base/Local/Target rules apply: preserve product-only file and dependency changes, apply Starter-only changes, and stop on simultaneous changes, unmanaged collisions or modified removals. Never bypass conflict refusal. Update writes an ignored recovery snapshot, verifies before application, and runs typecheck/build afterward; failed verification restores the snapshot.

Only run `starter:add` or `starter:update` after the user requests the update. Preserve product-owned changes, fail on collisions, use the All2CF service and receipt recorded in `.starter/source.json`, and never fall back to a public GitHub repository as the commercial update authority. After applying, run the project verification gates and report the exact previous/new Engine receipt plus remaining conflicts.

Source candidate builds, Artifact registration, R2 upload and Channel advancement belong to the canonical Starter repository and are excluded.
