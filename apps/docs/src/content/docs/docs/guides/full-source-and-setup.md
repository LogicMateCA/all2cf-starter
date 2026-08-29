---
title: Full Source and local Setup
description: Understand why the download contains every Pack template while the product runtime contains only selected capabilities.
---

The public repository and All2CF download expose one versioned Full Source Artifact. Downloading it does not create an All2CF cloud project, job, Draft, database, Worker, or billing record.

## Start locally

```bash
npm ci
npm run setup
```

Use `/setup` to choose the product shape, pages, SaaS modules, Providers, database access, Web/Mobile targets and release environments. Credentials remain local or are written to the selected deployment secret store; they are not committed to Git.

## Full source is not full runtime

Pack templates under `packs/` are assembler inputs. An unselected Pack contributes no realized application file, dependency, SQL migration, client route, Worker route, event handler, Cloudflare Binding, secret requirement or native module.

Materialization records every realized asset in `.starter/materialization.json`. Deselection removes only receipt-owned output and fails closed if generated output was edited afterward.

Every Engine release generates and verifies three independent products:

- a configured SQL-first product;
- a configured Drizzle product;
- a minimal SQL-first product with `optionalPackCount: 0`.

The minimal product may contain only the explicit permanent design/page/SaaS baseline.

## Optional All2CF connection

The project remains independent by default. A later `/setup` step may connect one stable local project identity to All2CF. Connection enables project-scoped MCP, managed update authorization and release receipts. Disconnecting removes only the cloud registration and token; it never removes local source, deployments, databases or Git history.
