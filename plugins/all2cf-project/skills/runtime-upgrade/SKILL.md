---
name: all2cf-runtime-upgrade
description: Check or upgrade dependencies in an All2CF-generated project using verified compatibility rather than registry recency alone.
---

# All2CF runtime upgrade

Read the project's `skills/runtime-upgrade/SKILL.md` and dependency policy. Check current stable upstream versions, but preserve Expo/React Native compatibility and keep Better Auth core plus selected official plugins on one verified line.

All2CF compatibility metadata may narrow an update choice; npm latest alone does not prove compatibility. Preview lockfile and runtime impact, update one coherent family at a time, run the recorded acceptance matrix, and do not combine dependency upgrades with unrelated feature work.
