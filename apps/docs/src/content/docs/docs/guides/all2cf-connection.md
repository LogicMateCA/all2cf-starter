---
title: Optional All2CF connection
description: Connect one local project identity for MCP and managed updates without making the product dependent on All2CF.
---

All2CF connection is optional and project-scoped. The open-source product can build, run and release without it.

From local `/setup`, choose **Connect to All2CF**. Browser pairing authenticates the user and organization, then creates one cloud card for the stable local project identity. Each project receives an independent revocable token; plaintext is returned only to the local project and cloud storage retains only its hash and metadata.

A connected card may expose:

- current Engine and Artifact identity;
- update availability and authorized update download;
- MCP project inspection;
- optional repository URL;
- Development and Production release receipts;
- token rotation and disconnect.

The cloud card does not configure Providers, credentials, pages, database schema or product features. Those remain local `/setup` responsibilities.

Disconnecting revokes the project token and cloud registration. It does not delete source, GitHub repositories, Workers, mobile applications, databases or storage.
