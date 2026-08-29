---
id: optional-all2cf-project-connection
title: Generated projects remain independent and can connect to All2CF at any time
status: local-verified
affectedModules: [assembler]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md]
---

# Outcome

A generated project installs, builds, runs and releases without All2CF. Its local Setup links to a dedicated All2CF connection page where an owner may import a project-scoped connection file, use paid update services, or disconnect later without changing project files, data, providers or deployment ownership.

# Scope

- Add project-local status, connect, disconnect and doctor commands plus the local `/all2cf` connection page.
- Keep credentials in ignored `.starter/update-auth.local.json`; never place them in runtime bundles or source control.
- Revoke the project token remotely when reachable, while always allowing local disconnection and independent operation.
- Keep hosted Factory credential-free. All2CF cards issue the optional connection file; update entitlement remains enforced only when an update is resolved.
- Refresh the generated lockfile after identity and Pack materialization in local and hosted generation so the independent package accepts `npm ci`.

# Verification

- Validate connection-file schema, local file mode, connected status, remote revocation request and independent fallback.
- Generate a portable product and prove its context, typecheck and build without All2CF environment variables.
- Verify All2CF typecheck, focused update control-plane tests and the browser card flow.

# Release

Local verification is in progress. Development and Production evidence will be recorded only after exact candidate deployment and live read-back.
