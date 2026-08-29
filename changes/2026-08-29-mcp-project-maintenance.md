---
id: mcp-project-maintenance
title: Unify paid All2CF MCP connection and Starter updates
status: local-verified
affectedModules: [assembler, product-shell, ai-context]
docsImpact: [AGENTS.md, CODEX.md, AGENT_MAP.md, PROJECT.md, ARCHITECTURE.md, Docs, /dp]
---

# Outcome

Generated projects remain independently runnable while local `/maintenance` provides one explicit place for All2CF MCP connection, project Token import, paid entitlement, installed receipt, update preview and authorized application. `/all2cf` and `/update` remain compatibility aliases.

# Scope

- Prefer the globally installed `all2cf-project` plugin and hosted MCP OAuth for Codex.
- Reuse the existing `all2cf-project-connection/v1` receipt and ignored `.starter/update-auth.local.json`; do not introduce a second Token format.
- Allow manual connection-file or JSON import as a fallback for other AI and IDE clients.
- Require server-side entitlement before paid update capabilities are presented as authorized.
- Add Setup completion choices for independent continuation or paid All2CF connection.
- Teach Codex to open `/maintenance`, preserve Token secrecy, and keep native Cloudflare operations on official Cloudflare MCP.

# Verification

- Maintenance contract validates routes, Setup entry points, MCP prompt, Token boundary, compatibility aliases and documentation.
- Plugin contract, Agent Map, knowledge and Change Spec checks pass.
- Web typecheck and production build pass.
- Browser acceptance covers desktop and mobile `/maintenance` in independent mode; live paid OAuth and entitlement remain a separate All2CF control-plane acceptance gate.

# Release

Canonical Starter source only. A new immutable Engine and public release are required before generated projects receive this behavior. No All2CF Core or Production deployment is authorized by this change.
