---
id: check-review-flow
title: Run update review as part of Check updates
status: verified
affectedModules: [assembler]
docsImpact: []
---

# Outcome

The local `Check & review` action now resolves the cloud version and builds the
safe Base/Local/Target diff in one user action. A conflict-free plan enables
Update; a conflicting plan remains visible and disables Update.

# Verification

- The web typecheck passes.
- The local update endpoint reports the real conflict plan instead of hiding it
  as a generic command error.
