---
id: legacy-project-adoption
title: Adopt older projects through bounded AI-context infrastructure
status: development-verified
affectedModules: [assembler]
docsImpact: [AGENTS.md, AGENT_MAP.md, skills/project-adoption/SKILL.md]
---

# Outcome

Older and independently built projects can adopt Starter AI routing without copying the complete Starter or replacing product-owned business code, schema, or custom design. The canonical migration runner exposes read-only scan and plan stages, an explicit apply stage with timestamped backups, and verification.

Apply installs a small self-contained project runtime, adoption receipt, ownership boundary, Agent Map, feature registry, candidate report, human Agent Map, bootstrap instructions, and package scripts. The project can then operate and verify its adoption without the canonical source checkout. Detected feature directories remain review candidates because directory names cannot prove business ownership.

The customer `all2cf-project` plugin adds an `all2cf-project-adoption` Skill that routes first adoption through the canonical runner and later work through the target project's own commands.

# Verification

- `npm run project:adopt:contract`
- `npm run plugin:contract`
- `npm run agent-map:check`
- `npm run knowledge:sync`
- `npm run knowledge:check`
- Skill frontmatter validation for canonical and plugin copies.

# Release

This change modifies the canonical Starter and plugin source only. It does not publish an Engine, plugin, update Channel, or production deployment. Publication remains a separate authorized release operation.
