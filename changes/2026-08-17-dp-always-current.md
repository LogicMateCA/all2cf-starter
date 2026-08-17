---
id: dp-always-current
title: Keep Development Plan synchronized with every material change
status: local-verified
affectedModules: [docs]
docsImpact: [AGENTS.md, PROJECT.md, RELEASE.md, features/docs/MODULE.md, /dp]
---

# Outcome

Every future AI can trust `/dp` to reflect the repository's current material behavior, architecture, ownership, and release policy without reconstructing decisions from chat history.

# Scope

- Make a focused Change Spec and affected canonical Markdown mandatory in the same material change.
- Require `knowledge:sync` and `knowledge:check` before completion.
- Keep Markdown/frontmatter authoritative and prohibit direct edits to generated `/dp` JSON.
- Require released `/dp` to identify the exact released commit and Change Spec after Development or Production deployment.

# Verification

- `knowledge:sync` regenerates the snapshot from Markdown/frontmatter.
- `knowledge:check`, `change:check`, and `ai:context -- --json` pass and report this Change Spec.
- Git diff confirms no generated snapshot became a tracked source file.

# Release

Local governance contract only. No deployment was requested; the next authorized Development release must publish this rule and verify live `/dp` commit/change identity.
