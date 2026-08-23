---
name: all2cf-project-change
description: Implement ordinary code, configuration, behavior, documentation or design changes inside an existing All2CF-generated project while keeping its AI context and /dp current.
---

# All2CF project change

Start with `AGENT_MAP.md` and task-scoped `ai:context`. Modify product-owned files for product-specific behavior. If a file is receipt-owned, inspect the receipt and use the project's Starter update/Pack workflow instead of patching generated output alone.

For every material change, update one focused `changes/*.md` and affected canonical Markdown. Run `knowledge:sync`, `knowledge:check`, `agent-map:check`, and risk-proportional code checks. Generated `/dp` data is evidence, not source.

Do not generalize a customer-specific feature into the canonical Starter or invoke `/factory` from this plugin.
