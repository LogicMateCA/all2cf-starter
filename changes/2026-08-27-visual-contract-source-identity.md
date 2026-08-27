---
id: visual-contract-source-identity
title: Correct the pinned Visual contract commit
status: local-verified
affectedModules: [visual-integration]
docsImpact: [integrations/visual.json]
---

# Outcome

Starter source verification reads the stable Visual integration contract from the exact Visual commit that contains it.

# Scope

Correct one mistyped character in the pinned immutable Visual source commit. No Visual capability, runtime, plugin, style, or Starter behavior changes.

# Verification

Run `npm run visual:integration:contract` and the Starter Engine candidate verification.

# Release

Ship with the next Starter Engine candidate. No Worker deployment is authorized by this correction.
