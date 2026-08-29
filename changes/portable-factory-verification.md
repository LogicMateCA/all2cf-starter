---
id: portable-factory-verification
title: Make generated portable projects independently verifiable
status: implemented
affectedModules: [assembler]
docsImpact: [AGENT_MAP.md, /dp]
---

# Outcome

Portable Factory output now keeps compact Catalog, Page Catalog and StyleKit reference snapshots while pruning reusable Pack templates. Its Agent Map removes only references to unavailable files, so ordinary AI context remains bounded and every routed path exists.

Generated projects receive a portable verification command, a root-based Change Spec policy, a one-time `starter:init` Git bootstrap, an identity-correct package lock and current Wrangler environment types. The portable source remains All2CF-managed through its source receipt and does not carry the reusable Pack template library.

# Verification

Factory contract passed. A fresh portable project passed clean `npm ci`, Agent Map, provider/auth contracts, knowledge synchronization, Change Spec enforcement, Wrangler type checks, Web/Worker/Expo/Astro type checks, Marketing/Web/Docs builds, cache and bundle budgets, and Development/Production Wrangler dry-runs.

# Release

Not released. This change only prepares a new immutable Factory engine candidate for All2CF Starter v2.
