---
id: adaptive-controller-fast-start
title: Adaptive Sol control and fast-by-default Web startup
status: development-verified
affectedModules: [assembler, auth, docs, marketing, product-shell]
docsImpact: [AGENTS.md, PROJECT.md, RELEASE.md, PERFORMANCE.md, starter.manifest.json, .ai/manifest.json, .ai/orchestration.yaml, features/docs/MODULE.md, /dp]
---

# Outcome

Sol remains the sole controller without wasting high reasoning on every task, and the reusable Web surfaces load only the code and data needed by the requested route.

# Scope

- Make Sol reasoning adaptive across light, medium, and high, with medium as the ordinary implementation default and high reserved for architecture, release, ambiguous cross-module judgment, and high-risk mutation.
- Keep Luna medium workers bounded and preserve the controller-only commit, migration, and deployment boundary.
- Split the React dispatcher from the complete Development Plan implementation so Login, Product, Support, Admin and Setup do not download `/dp` code.
- Isolate the stable React runtime as its own vendor chunk so ordinary application changes do not invalidate and redownload the framework payload on repeat visits.
- Delay the below-fold shadcn/Recharts technology chart until it approaches the viewport.
- Replace the materially different `/dp` data fallback with a stable loading frame and reserve account-control width to prevent asynchronous layout shifts.
- Generate a checked compact `/dp/project.index.json` for the visual plan while retaining the complete AI-readable snapshot, avoiding transfer and parse of unused Markdown bodies on every visit.
- Keep only route-rendered module summaries and lifecycle metadata in the compact index; Change Spec and canonical-document bodies remain exclusively in the full AI snapshot.
- Preserve the complete `/dp` generated directory during the Marketing/React/Docs merge so compact and full projections share one collision-checked public namespace.
- Add a `/dp`-only Worker response preload for the compact index so its critical data request runs in parallel with route JavaScript without taxing Login or product routes.
- Add route-dispatcher and route-chunk gzip budgets so the optimized boundary cannot silently regress.

# Verification

Baseline against `https://dev.logicm8.com` with Lighthouse 13.4.1 and pinned Chromium 1234: Marketing Desktop scored 100 with 0.5s LCP; Marketing Mobile scored 99 with 1.6s LCP; Login Desktop scored 97 with 1.1s LCP; Login Mobile scored 87 with 3.4s LCP and about 30KB unused JavaScript; Docs Desktop scored 99 with 0.7s LCP; `/dp` Mobile scored 87 with 2.3s LCP, 0.198 CLS, 360KB transferred, a 104KB below-fold chart chunk, and a 98KB project snapshot.

Post-change verification must record the same Lighthouse workloads, route chunk sizes, typecheck, Web build, bundle budgets, knowledge synchronization, and browser behavior. Chrome DevTools MCP was configured but its browser target was closed, so raw DevTools trace evidence remains unavailable in this run.

The production build now emits a `2.4KB` gzip dispatcher, `59KB` stable React vendor chunk, `3.4KB` Login chunk, and `7.6KB` `/dp` chunk. Login Desktop improved from score 97 and `1.08s` LCP to score 100 and `0.51s`; Login Mobile improved from score 87 and `3.42s` LCP to score 98 and `2.03s`, with transfer falling from about `138KB` to `111KB`. `/dp` initial transfer fell from about `368KB` to `163KB`, the `104KB` chart chunk no longer enters the initial request set, TBT fell from `42ms` to a three-run median of `7ms`, and CLS fell from `0.198` to zero. `/dp` Desktop scored 100 with `0.58s` LCP; three throttled Mobile runs had median score 96, `1.69s` FCP and `2.52s` LCP.

The full repository verification passed. Public merged-Worker acceptance passed 48 cases and 50 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T15-43-46-108Z/public`; isolated authenticated acceptance passed 28 cases and 48 screenshots with zero failures at `test-results/browser-acceptance/2026-08-21T15-45-42-263Z/authenticated`. Both bind to artifact SHA-256 `e5aee08c2f3553454557b530b6a5cc2975d4f9a54d2a1f74bf4ed0fd6636c1da`. The authenticated run also passed registration, verification, sign-in, preferences, notifications, Support, Admin, password reset, session revocation and CFsend contract delivery against a disposable database.

# Release

Functional commit `9a27313db7bba33e6a52b2d9ee17c676b9b8c85c` and artifact `acfa665b2c090a6beecc3d4f34dead9a6971337d29fb70dfacd24c092ff345cd` are Development verified on Worker `starter-dev` and `dev.logicm8.com`. Cloudflare deployment `2b3ea693-04b2-49bf-ab23-7ddb539b9546` serves version `54277d80-236e-4bdd-9cb2-bdcdf32eaf1e` at 100% traffic. Official MCP read-back confirmed the exact commit annotation, custom domain, required secrets, Development variables, Hyperdrive `d665e59cdc9741c1898ba7c472c22abf`, database `starterdev`, and user `starterdev`. Live `/dp` exposed the exact clean commit, compact-index preload, and generated snapshot.

Post-release Lighthouse measured Login Mobile score 93 with `2.78s` LCP, `/dp` Mobile score 91 with `3.08s` LCP and zero CLS, and `/dp` Desktop score 99 with `0.69s` LCP and `0.048` CLS. These network-bound Development results are intentionally recorded separately from the faster local production-build measurements. Production remains unchanged.
