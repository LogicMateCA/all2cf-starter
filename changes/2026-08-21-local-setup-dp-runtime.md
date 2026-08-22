---
id: local-setup-dp-runtime
title: Keep local Setup and Development Plan always available
status: local-verified
affectedModules: [assembler, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, compose.yaml, /dp]
---

# Outcome

`http://localhost:15173/setup` and `http://localhost:15173/dp` survive terminal/task completion and container restarts instead of depending on an AI-owned temporary process.

# Scope

- Run `npm run setup` as the `starter-dev` Compose service's supervised main process.
- Restart the local service unless the owner explicitly stops it.
- Keep port `15173` responsible for local Setup and the current worktree Development Plan.
- Preserve `dev.logicm8.com/dp` as the read-only view of the exact Development release; it does not replace the local planning view.

# Verification

- Recreate `starter-dev`, wait for Vite readiness, and verify local `/setup`, `/dp`, and `/__starter/setup` return 200.
- Restart the service and repeat the checks without manually running `npm run setup`.
- Run knowledge and Change Spec contracts.

# Release

Local runtime change only. No Cloudflare deployment or Production mutation is part of this change.
