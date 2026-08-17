---
title: "Starter release contract"
status: "template"
source: "starter"
---

# Release

## Environments

- Generic “发布” or “deploy” means development only.
- “正式发布” or “production” is the explicit Production authorization. Do not request a second confirmation.
- Child workers cannot deploy or commit. Sol remains the high-level controller for release actions.

## Checklist

- [ ] Clean, identified commit and package/artifact recorded
- [ ] Change Spec and current Markdown/frontmatter source updated
- [ ] Relevant tests, build, migration, and route checks passed
- [ ] Cloudflare facts/operations checked through official MCP first
- [ ] Worker Studio capabilities detected where applicable
- [ ] Rollback and monitoring plan recorded

## Evidence

Report exact environment, identity, commands/checks, results, failures, and unverified gates. Never call a build or HTTP 200 alone a complete release validation.
