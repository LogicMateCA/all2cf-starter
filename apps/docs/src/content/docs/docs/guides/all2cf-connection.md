---
title: Optional All2CF connection
description: Connect one local project identity for MCP and managed updates without making the product dependent on All2CF.
---

All2CF connection is optional and project-scoped. The open-source product can build, run and release without it.

Open local `/maintenance`; `/all2cf` and `/update` remain compatibility aliases. The project may continue independently or connect later.

For Codex, copy the MCP connection prompt shown on `/maintenance`. The globally installed `all2cf-project` plugin connects to the hosted All2CF MCP with OAuth. Codex identifies the project from `.starter/source.json`, asks All2CF to verify ownership and paid entitlement, receives a project-scoped connection receipt, and connects it with `npm run all2cf:connect -- <receipt-path>`. Codex must never print or commit the Token.

For another AI, IDE or manual workflow, import the same cloud-issued connection JSON on `/maintenance`. The receipt contains an independent revocable project Token; plaintext is stored only in ignored `.starter/update-auth.local.json`, while cloud storage retains only the secure authorization record and metadata.

A connected card may expose:

- current Engine and Artifact identity;
- update availability and authorized update download;
- MCP project inspection;
- optional repository URL;
- Development and Production release receipts;
- token rotation and disconnect.

The cloud card does not configure Providers, credentials, pages, database schema or product features. Those remain local `/setup` responsibilities.

Disconnecting revokes the project token and cloud registration. It does not delete source, GitHub repositories, Workers, mobile applications, databases or storage.

The required update order is connection status, server-side entitlement, update check, local diff, then an explicitly requested apply action. GitHub is not the commercial update authority. Cloudflare resource inspection and mutation use official Cloudflare MCP rather than All2CF MCP.
