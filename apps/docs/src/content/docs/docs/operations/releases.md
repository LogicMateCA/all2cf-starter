---
title: Release lanes
description: The authorization and evidence contract for Cloudflare and Expo releases.
---

## Cloudflare Web and Worker

- “发布” or “deploy” authorizes the Development Worker after required checks.
- “正式发布” or “production” authorizes the Production Worker.
- A Development release must keep its exact commit, bindings, routes, database identity, verification evidence, and rollback candidate.
- A production release must use the reviewed artifact and must not silently absorb unrelated dirty changes.

## Expo

Expo Development, Preview, and Production are distinct EAS profiles. Build, Update, store submission, credentials, versioning, and rollback evidence are handled by the Expo release workflow. A Web Worker release does not imply an app-store release.

## Database

New Starter projects use empty Development and Production databases with separate identities. SQL migrations are checksum-locked and applied explicitly. Database structure is not changed merely because application code was built or published.
