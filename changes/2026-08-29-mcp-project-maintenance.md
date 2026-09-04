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
- Make one `Connect All2CF MCP` action own PKCE/state authorization, cloud project binding, paid-entitlement verification, one-use code exchange and automatic local Receipt storage; no user-facing AI Prompt or Token copy is part of the primary flow.
- Reuse the existing `all2cf-project-connection/v1` receipt and ignored `.starter/update-auth.local.json`; do not introduce a second Token format.
- Allow manual connection-file or JSON import as a fallback for other AI and IDE clients.
- Require server-side entitlement before paid update capabilities are presented as authorized.
- Add Setup completion choices for independent continuation or paid All2CF connection.
- Teach Codex to open `/maintenance`, preserve Token secrecy, and keep native Cloudflare operations on official Cloudflare MCP.

# Verification

- Maintenance contract validates routes, Setup entry points, automatic MCP authorization endpoints, local/cloud version, release notes, Token boundary, compatibility aliases and documentation.
- Plugin contract, Agent Map, knowledge and Change Spec checks pass.
- Web typecheck and production build pass.
- Browser acceptance covers desktop and mobile `/maintenance` in independent mode; live paid OAuth and entitlement remain a separate All2CF control-plane acceptance gate.
- A local stable 2.1.1 Receipt generated PKCE/state and received a real Development `authorization_url` plus expiry from `a2cdev.logicm8.com`; an invalid callback state failed closed while preserving the pending request. The temporary local Receipt, installation identity and PKCE file were removed after proof. Interactive paid approval/code exchange still requires a signed-in entitled account.

# Release

Canonical Starter source remains unreleased until a new immutable Engine and public release are built. The matching All2CF Core automatic-connection protocol and update metadata are Development-only at commit `f99014426e11968b866388f445b9670852ff3b49`, Worker version `3fa9973e-8dcf-47e0-acdb-4c67fa93e622`, and `https://a2cdev.logicm8.com`; protocol, PKCE/state, one-time exchange, ownership, highest entitlement level/full features, Hosted MCP, release URL and redirect-negative gates passed. Structured release notes remain an explicit empty array until a trusted source exists. Production remains unchanged and is not authorized by this change.
