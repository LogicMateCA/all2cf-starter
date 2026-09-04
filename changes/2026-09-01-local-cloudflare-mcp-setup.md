---
id: starter-local-cloudflare-mcp-setup
title: Local Tunnel and Cloudflare MCP environment setup
status: proposed
affectedModules:
  - setup
  - cloudflare
  - local-development
  - documentation
docsImpact:
  - cloudflare/setup-plan.json
  - starter.config.json
securityImpact: high
migrationImpact: low
rollback: remove the Local environment fields and use the existing Development and Production configuration
---

# Summary

The first Setup page now owns three explicit runtime environments: Local test, Development Worker and Production Worker. Local uses a localhost URL and a direct Tunnel database connection; Development and Production retain separate Worker, domain, database and Hyperdrive identities.

# Cloudflare MCP handoff

`cloudflare/setup-plan.json` is the machine-readable execution plan for Codex and Cloudflare MCP. It instructs the executor to read `starter.config.json`, reconcile the named Tunnel and Workers VPC/Hyperdrive bindings, configure the two deployed Workers and record verified resource IDs in an ignored receipt. The plan never contains secrets and Production requires explicit confirmation.

# Safety

Local configuration is not a Cloudflare deployment. Local, Development and Production URLs, Workers, databases and secrets are kept separate. A resource is not reported as configured until the relevant Tunnel, Worker, route and database binding have been verified.

