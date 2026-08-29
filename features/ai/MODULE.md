---
module: ai
status: local-verified
source: starter
---

# AI module

Purpose: provide a Cloudflare-native, server-only inference boundary without forcing AI cost, SDKs or public prompt endpoints into every copied product.

- `none` is the default. Selecting Workers AI materializes `capability.workers-ai`, the `AI` Binding, environment model/Gateway variables and one owned Worker helper.
- Development and Production select their model and optional AI Gateway ID independently. An empty Gateway ID calls Workers AI directly; a configured ID routes through AI Gateway using the Binding's third argument.
- `runWorkersAi` accepts only a server-supplied bounded prompt, caps output and returns model/Gateway/log identity. Product-specific prompt templates, authorization, quotas, retention and evaluation remain copied-product code.
- `/api/admin/ai/test` is platform-Admin-only and uses a fixed prompt. The Starter does not expose arbitrary public inference.
- Setup's real test uses the existing write-only Cloudflare account credential and returns only bounded non-secret evidence. Admin health checks configuration only and never creates model traffic.

Real direct and `default` AI Gateway requests returned `STARTER_AI_OK`. Selected Worker types and dry-runs passed; complete deselection removed the feature and Binding. A deployed Development Binding call, cost/limit policy, chosen production model, product evaluation set and Production release remain explicit gates.
