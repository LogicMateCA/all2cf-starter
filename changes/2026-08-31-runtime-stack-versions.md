---
id: runtime-stack-versions
title: Show installed runtime dependency versions
status: verified
affectedModules: [assembler, auth]
docsImpact: [apps/docs/src/content/docs/docs/guides/all2cf-connection.md]
---

# Outcome

`/maintenance` shows a separate Runtime stack beneath Starter Pack versions.
Versions are read from the generated project's `package-lock.json`, including
Better Auth core and selected official adapters, React, Vite, Astro, Expo,
Drizzle, Wrangler and TypeScript when actually installed. Missing or unselected
runtime packages are not invented.

# Verification

- The connected proof project reports Better Auth, Better Auth Expo and Better
  Auth Stripe at 1.7.1 plus its installed frontend/tooling versions.
- Web typecheck passes and the status endpoint returns the runtime array without
  another network request.

