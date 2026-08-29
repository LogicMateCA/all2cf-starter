---
id: 2026-08-20-starlight-docs-foundation
title: Static Starlight Docs on the existing Worker
status: local-verified
affectedModules: [docs, assembler, web]
docsImpact: [PROJECT.md, ARCHITECTURE.md, DESIGN.md, PERFORMANCE.md, features/docs/MODULE.md, design/catalog.json, pages/catalog.json, starter.manifest.json, /docs, /dp]
---

# Decision

Add a separate static `apps/docs` workspace using the current stable Astro and Starlight line. Its output is collision-checked and merged under `/docs` into the existing Worker asset artifact. It does not create a second Worker, add server rendering, duplicate authentication, or change the Hono API.

# Rationale

Public product documentation and internal project memory have different audiences. Starlight owns searchable user and operator docs; Markdown contracts and Change Specs remain the source for `/dp`. Static generation keeps the public Docs path fast and removes runtime framework work from Cloudflare requests.

# Compatibility and data

The new workspace requires Node 24 and adds no database schema, binding, or runtime secret. Existing `/`, `/login`, `/app`, `/setup`, `/dp`, and `/api/*` ownership is unchanged. The Starter database remains an empty-project baseline.

The repository uses TypeScript 6.0.3 as the latest line compatible across Astro Check, Volar, Expo, Web, and Worker workspaces. TypeScript 7.0.2 is stable but cannot currently run Astro Check because the current Volar checker still expects the pre-7 compiler system API; retaining 7 would make the Docs type gate false evidence.

# Rollback

Remove `apps/docs`, the docs merge step, its dependencies, and the generated `/docs` files from the asset artifact. The React Web and Worker artifact remain independently buildable.

# Validation evidence

- Live package-registry comparison confirmed Astro 7.2.4, Starlight 0.41.7, and Sharp 0.35.3 as their current stable releases; installed declarations match those versions.
- Astro Check passed with zero errors, warnings, or hints after aligning the monorepo on TypeScript 6.0.3.
- Static generation produced `/docs`, Getting Started, Starter usage, and release-lane pages plus a Pagefind search index. The collision-failing merge accepted only `docs`, `_docs`, and `pagefind`; rendered MDX cards and required source text were inspected in the final artifact.
- Docs initial scripts total 2,576 bytes gzip against a 20,000-byte budget. Pagefind WASM artifacts are 72,209 and 68,024 bytes raw against a 600,000-byte per-file ceiling.
- Full `npm run verify` passed: AI/knowledge/change contracts, generated Worker types, Astro plus all TypeScript workspaces, combined Web/Docs build, both bundle budgets, and both Cloudflare dry runs.
- Wrangler local workerd served `/docs/`, `/docs/getting-started/`, a Docs module asset, and Pagefind JavaScript with HTTP 200 from the combined artifact. No deployment was performed or authorized.
