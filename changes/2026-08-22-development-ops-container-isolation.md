---
id: development-ops-container-isolation
title: Remove host and Production mounts from the everyday Setup container
status: implemented
affectedModules: [assembler, operations]
docsImpact: [ARCHITECTURE.md, RELEASE.md, features/assembler/MODULE.md, skills/cloudflare-release/SKILL.md, skills/starter-bootstrap/SKILL.md, /dp]
---

# Outcome

The always-running local Setup/Vite container can edit the project and run ordinary checks without the host Docker socket or Production SSH material. Infrastructure provisioning and Production operations use an explicit, short-lived `starter-ops` profile.

# Scope

- Remove Docker Socket, Production SSH key and known-host mounts from `starter-dev`.
- Add a profile-gated `starter-ops` service with those operational mounts and no published ports.
- Keep the shared Node volume and project source so the same reviewed scripts run in both containers.

# Verification

- Compose validation proves `starter-dev` has only `/workspace`, its Node volume and the read-only shared profile; it has neither Docker Socket nor Production SSH mounts.
- Recreated `starter-dev` returned local Setup HTTP 200. A short-lived `starter-ops` read-only preflight saw both required operational mounts and published no Setup port.

# Release

Local development topology only. No Cloudflare or Production change.
