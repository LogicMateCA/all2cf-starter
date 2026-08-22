---
id: agent-map-fast-context
title: Route routine AI work through a compact Agent Map
status: implemented
affectedModules: [assembler, docs]
docsImpact: [AGENTS.md, AGENT_MAP.md, PROJECT.md, features/assembler/MODULE.md, features/docs/MODULE.md, skills/project-context/SKILL.md, /dp]
---

# Outcome

After initial setup, an AI starts from a compact ownership map instead of loading every Catalog, Module, Pack and historical Change Spec. Task and module queries reveal only the files, docs, checks and Skills needed for that scope.

# Scope

- Add a human `AGENT_MAP.md` entry point and machine-readable `.ai/agent-map.json` with 15 responsibility routes covering all 24 documented modules.
- Make default `ai:context` return map-only context, four default reads, selected-pack identity and release alignment.
- Add `--task`, `--module`, `--full` and `--first-run` modes. Only the explicit full modes retain whole-project output.
- Rank at most three directly related Change Specs from route ownership and task terms instead of recommending all history.
- Add a contract for route paths, module coverage, command existence, representative Chinese task routing and a 12KB maximum default response.

# Verification

- Complete repository verification passes, including Agent Map, Change Spec, knowledge synchronization, types, builds, bundle budgets and both Cloudflare configuration dry-runs.
- Focused contract currently reports 15 routes, all 24 modules covered, an 8,153-byte default response, four default reads, `auth-account` routing for a Chinese login/email task and `mobile-expo` routing for the Mobile module.
- Explicit `--full` remains available and currently produces the complete first-run/architecture context; ordinary calls no longer receive it.

# Release

No release yet. Development and Production remain unchanged.
