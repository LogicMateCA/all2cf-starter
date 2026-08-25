---
id: global-all2cf-project-plugin
title: Install the All2CF Project plugin once instead of copying it into every project
status: local-verified
affectedModules: [assembler]
docsImpact: [AGENTS.md, PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md]
---

# Outcome

`all2cf-project` is a user-installed Codex plugin shared by every generated project. Factory output no longer contains a duplicate `plugins/` tree. Projects remain fully operable without the plugin through their own AGENTS, Agent Map, receipts and scripts; the optional plugin detects those project-local contracts and adds common AI workflows.

# Scope

- Keep the canonical plugin source in Starter for controlled publication and validation.
- Publish/install one personal Marketplace copy and use a cache-busted version for Codex pickup.
- Declare the plugin as `external-recommended`, optional and marker-detected in `.ai/plugins.json`.
- Remove plugin source and source-only plugin verification from generated products.

# Verification

- Validate the canonical and personal plugin manifests.
- Generate local and portable products; reject any bundled plugin directory or project-relative plugin path.
- Prove a generated product retains independent type/build commands without plugin installation.
- Confirm Codex lists one enabled `all2cf-project@personal` installation.

# Release

Local verification is in progress. A new Starter Engine and All2CF Development integration remain pending; Stable and Production are unchanged.
