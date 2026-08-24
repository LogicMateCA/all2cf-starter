---
id: all2cf-control-plane-preflight
title: Accept explicit All2CF control-plane Cloudflare preflight evidence
status: implemented
affectedModules: [assembler, operations]
docsImpact: [ARCHITECTURE.md, RELEASE.md, skills/starter-update-release/SKILL.md, /dp]
---

# Outcome

Generated projects keep official Cloudflare MCP as the default AI-operated preflight, while All2CF-managed Development releases may record a distinct `all2cf-control-plane` snapshot produced from the organization's saved Owner connection. The receipt never claims to be MCP evidence. It retains exact account, config hash, project identity, target inventory, collision, freshness and Worker Studio checks, and `starterctl` accepts it only when the trusted Runner explicitly identifies itself as the All2CF control plane.

All2CF may adopt an existing Hyperdrive configuration through `STARTER_EXISTING_HYPERDRIVE_ID`. `starterctl` reads the live configuration and refuses it unless database and user match the generated project configuration; this skips local Docker/VPC provisioning without weakening migration or Worker binding checks.

# Verification

Add a deterministic contract covering valid MCP evidence, valid All2CF evidence, stale/mismatched/untrusted rejection and the environment gate. Run Factory, Engine Channel, knowledge, Agent Map, Change Spec, SQL-first and Drizzle portable candidate checks.

# Release

Source change for the next Development Engine. Stable and Production remain unchanged.
