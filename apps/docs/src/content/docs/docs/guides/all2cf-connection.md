---
title: Optional All2CF connection
description: Connect one local project identity for MCP and managed updates without making the product dependent on All2CF.
---

All2CF connection is optional and project-scoped. The open-source product can build, run and release without it.

After OAuth connection, the ignored project authorization receipt owns the All2CF update-service URL. A source receipt URL is used only as a pre-connection fallback, so a project can move from a Development control plane to Production without retaining the Development endpoint.

Open local `/maintenance`; `/all2cf` and `/update` remain compatibility aliases. The project may continue independently or connect later.

Choose **Connect All2CF MCP**. The local development service creates PKCE and state, then opens All2CF OAuth. All2CF verifies the user, organization, project ownership and paid entitlement, creates or binds the cloud project, and returns one short-lived authorization code. The local service exchanges it for the project-scoped connection Receipt, stores it in the ignored authorization file and reloads `/maintenance`. The user does not copy an AI Prompt or Token.

**Advanced recovery** may import the same cloud-issued connection JSON when automatic OAuth is unavailable. The receipt contains an independent revocable project Token; plaintext is stored only in ignored `.starter/update-auth.local.json`, while cloud storage retains only the secure authorization record and metadata.

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

The diff is conservative. The installed materialization Receipt is Base, the current project is Local, and the authorized release is Target. Target-only changes are safe; Local-only files and dependency versions are retained; both-changed paths, unmanaged collisions and modified removals block application. `/maintenance` reports each category. Codex may propose a conflict merge, but cannot apply it without approval.

The maintenance page also compares installed and cloud Pack versions. Installed Packs show Local, Cloud and update state; uninstalled Packs remain collapsed Catalog entries and do not add files or runtime code. Check, diff, update, All2CF project, release and disconnect actions stay in one toolbar above the version and change evidence.

Runtime stack versions are separate from Pack versions. They come from the generated project's package lock and show Better Auth and selected official adapters plus installed framework and tooling dependencies; an uninstalled runtime is never shown as active.

Before applying, the updater creates an ignored compressed recovery snapshot and verifies the current project. After applying, it runs typecheck and build; failure restores the snapshot. The always-installed `foundation.core` carries curated Starter infrastructure updates. Unselected Packs remain Catalog entries and add no project files or runtime until selected.
