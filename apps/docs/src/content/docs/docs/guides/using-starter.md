---
title: Use the Starter
description: How an AI controller should turn the Blueprint into an owned product.
---

## Controller loop

1. Read the compact context with `npm run ai:context -- --json`.
2. Compare Blueprint selections with Catalog contracts and realized code.
3. Create one focused Change Spec for the next material slice.
4. Implement the smallest owned change that closes that slice.
5. Update every affected canonical Markdown source in the same change.
6. Run `npm run knowledge:sync`, `npm run knowledge:check`, and verification proportional to risk.
7. Record what is local-only, Development-verified, or Production-released without collapsing those states.

## Ownership boundaries

- StyleKit is an audited input to the owned Design Engine, not a runtime dependency.
- PowerAI contributes public-page structure, not brand, authentication, demo content, or an upstream update relationship.
- MapCN contributes adapted Web components; MapLibre is the runtime renderer.
- OpenSaaS, LastSaaS, Open Design, and RunCopilot are references only.
- Better Auth core and selected official plugins stay on one reviewed stable-compatible line.

## Keep the system understandable

Every material change must leave a current answer to four questions: what is selected, what is implemented, what has been verified, and what has actually been released. `/dp` is the read-only projection of those answers; Markdown and frontmatter remain canonical.
