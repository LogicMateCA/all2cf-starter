---
id: maintenance-action-progress
title: Explain guarded update actions and progress
status: verified
affectedModules: [assembler]
docsImpact: []
---

# Outcome

`/maintenance` highlights Review diff until a plan exists, highlights Update
only after a conflict-free review, explains disabled states, and shows an
indeterminate progress bar for check, review and update operations. Conflict
plans returned with a non-zero updater exit are treated as valid review evidence
rather than hidden as transport errors.

# Verification

- The connected proof returns a structured plan with three both-changed files;
  Review remains usable and Update remains blocked.
- Web typecheck passes and the local diff endpoint returns HTTP 200 with the
  conflict plan.
