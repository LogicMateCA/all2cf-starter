---
name: all2cf-cloudflare-release
description: Route Worker application build, deploy, verification or rollback requests for an All2CF-generated project through its repository release contract and official Cloudflare tooling. Canonical Starter Engine, Artifact and Channel publication is explicitly excluded.
---

# All2CF Cloudflare release

Read the project's `skills/cloudflare-release/SKILL.md` and follow it as the executable contract. Use official Cloudflare MCP first for current platform facts and supported operations. Do not duplicate Cloudflare APIs in All2CF MCP.

Generic “发布” or “deploy” targets Development. Only explicit “正式发布” or “production” targets Production. Bind every result to an exact clean commit, artifact, Worker/version identity, domain, verification evidence and rollback point. HTTP 200 alone is not success.

This plugin provides routing and policy only; it does not own Wrangler scripts, VPC/Hyperdrive provisioning or Cloudflare resource inventory.

Never reinterpret Engine, Artifact, source-release, Channel or canonical R2 publication as a Worker deployment. Those requests belong to the separately owned canonical Starter administration workflow.
