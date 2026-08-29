---
id: workers-ai-gateway
title: Add selectable Workers AI and AI Gateway
status: local-verified
affectedModules: [assembler, ai, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/ai/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select Cloudflare Workers AI, choose a different model and optional AI Gateway per environment, test the Development configuration with a real bounded inference request, and materialize no AI code or Binding when AI is not selected.

# Scope

- Add a receipt-owned `capability.workers-ai` Pack with a server-only bounded inference helper and a platform-Admin Binding test route.
- Generate the `AI` Binding plus `AI_PROVIDER`, `AI_MODEL` and `AI_GATEWAY_ID` variables only while selected; Development and Production configuration remain distinct.
- Add Setup selection, model/Gateway fields, official model and Gateway links, a fixed-prompt Cloudflare REST test and a deployed Binding test boundary.
- Treat AI Gateway as an optional overlay within Workers AI rather than a misleading independent Provider choice.
- Report selected Binding/model/Gateway readiness in read-only Admin health without generating inference traffic.

# Verification

- Local Setup made a real direct request to `@cf/meta/llama-3.1-8b-instruct` and received `STARTER_AI_OK`.
- A second real request through AI Gateway ID `default` received `STARTER_AI_OK`.
- The selected Pack generated the AI Binding and exact variables in both Worker configurations; generated types, all workspace types and both Wrangler dry-runs passed.
- Deselect/apply removed the Worker feature, Binding and variables; the complete default Workerd authentication/operations regression then passed.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures after the new AI controls were added.
- Official Cloudflare MCP and Worker Studio MCP were not callable in this session. Current Binding and Gateway request shapes were checked against current official Cloudflare documentation.

# Release

Local/provider verification only. The current Blueprint leaves Workers AI unselected. Development still requires a deployed Binding call before it can become Development verified; Production remains unchanged.
