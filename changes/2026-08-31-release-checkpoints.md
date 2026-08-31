---
id: release-checkpoints
title: Resume Starter releases from verified checkpoints
status: verified
affectedModules: [assembler]
docsImpact: [skills/starter-update-release/SKILL.md]
---

# Outcome

The canonical release Skill now separates source, candidate, Development,
public and Production checkpoints. A later failure resumes from the last exact
`sourceCommit / engineVersion / artifactSha256` checkpoint instead of rebuilding
the Engine. It also records recovery rules for damaged dependency volumes,
fixture drift and owner-only database migrations.

# Verification

- Skill validation confirms the entrypoint and checkpoint reference are valid.
- Release identity and Stable Pack-map requirements remain explicit.
