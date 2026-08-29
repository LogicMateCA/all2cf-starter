---
id: runner-auth-drift-contract
title: Classify Core to Runner authorization drift as a service failure
status: production-verified
affectedModules: [assembler]
docsImpact: [PROJECT.md]
---

# Outcome

A user who can list an organization-owned Draft must be able to request its generation. A 401 returned by the private Core-to-Runner hop is service credential drift, not evidence that the browser user is unauthorized. Core must convert that failure to a retryable generation-service response and the UI must preserve the Draft instead of showing a user-level `Unauthorized` message.

# Evidence

Production logs showed both private headers present while the Worker sent a 64-character database Runner token and the general Runner expected its independent 43-character token. Synchronizing the general Runner token restored Create, Generate, Ready, Download, Connect AI and configuration save. The production hotfix was released as Core `0.6.153` from `ca65fdf8fa462f4fa2b41e38f0dba73c05dfdf01`.

# Verification

- `npm run factory:ux:contract`
- All2CF runner-routing regression covers private Runner 401 classification.
- Production isolated-owner generation completed and its project, user and organization were removed.

# Release

This Change Spec records the already deployed foundation correction. It does not authorize a new release or change any Runner token value in Starter source.
