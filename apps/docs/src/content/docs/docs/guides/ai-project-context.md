---
title: AI project context
description: Give coding agents the smallest durable context needed to change and verify a project.
---

Start ordinary work with `AGENTS.md` and `AGENT_MAP.md`, then route the task:

```bash
npm run ai:context -- --task "add the first product capability"
```

The command selects one ownership domain, its primary files, module documentation, checks, Skills and a small set of recent relevant Change Specs. Do not load the entire Catalog, every Pack or all project history for routine changes.

Product-specific capabilities belong in `.ai/features.json`. Run `npm run feature:sync` after registering a new domain so machine and human Agent Maps remain aligned.

Reusable foundation defects discovered in a product must be fixed in the immediate product as needed, then generalized into canonical Starter with a regression contract, documentation and update path. Product business behavior stays local.
