---
id: foundation-bug-upstream-rule
title: Upstream reusable product fixes into Starter
status: implemented
affectedModules: [ai-context, updates]
docsImpact: [AGENTS.md, dp]
---

# Outcome

Every reusable foundation bug discovered in All2CF or another generated/adopted product is also corrected and regression-tested in canonical Starter. Product-specific business fixes remain owned by that product.

# Scope

Add a permanent AI operating rule. The rule covers authentication, sessions, email delivery, shell behavior, providers, deployment, updates, data-layer contracts, mobile release, Agent Map, and other reusable foundations.

# Verification

Run Change Spec, knowledge, and Agent Map checks. Future foundation fixes must show both product evidence and Starter evidence before completion.

# Release

This rule changes source governance only. It does not authorize a Starter Engine or product deployment by itself.
