---
module: docs
status: local-verified
source: starter
---

# Docs module

Purpose: own public Astro Starlight documentation, internal Markdown contracts, and the read-only `/dp` view of the Project Blueprint, Catalog, code, verification, and release evidence.

- Audience: product users, operators, project owners, and AI controllers.
- Canonical source: Markdown with frontmatter
- `/dp` output: generated from the Markdown source
- Factory/Setup relationship: source `/factory` creates a product and generated-project `/setup` changes that product's reviewed Blueprint; `/dp` reports the current project only. Public Starlight docs remain independent of all local control routes.
- Page Catalog relationship: `docs.public` is a required Starlight route in `pages/catalog.json`. PowerAI does not own Docs, `/dp`, or authentication content.
- Runtime shape: `apps/docs` builds static Astro/Starlight output. A collision-failing merge step combines Marketing root output, React under `/_app`, and Docs `/docs`, `/_docs`, and `/pagefind` paths into the existing Worker asset artifact; Docs adds no Worker, SSR adapter, binding, secret, or database object.
- Freshness owner: Sol controller through a focused Change Spec, affected canonical Markdown updates, `knowledge:sync`, and `knowledge:check` in every material change.
- AI context uses progressive disclosure: Agent Map first, task/module context second, exact source files third. The default context has a hard size contract and never recommends the full Change-Spec archive.
- Setup and Provider documentation must link to the official application/configuration source recorded by the Provider Catalog; users should never need to search for Google, CFsend, Resend, Stripe, Cloudflare Email Service, GitHub, Apple, R2, S3-compatible, Turnstile, Cloudflare release, EAS, App Store Connect or Google Play setup entry points.
- `providers:contract` enforces those links and verification actions for every external selectable option; a Planned or mismatched credential name cannot pass `/dp` synchronization as available.
- Performance boundary: `/dp` owns a route-specific dynamic chunk, renders from a freshness-checked compact projection of the complete AI snapshot, reserves its loading geometry, and defers below-fold chart code until it approaches the viewport. Login and ordinary product routes must not download the `/dp` implementation; the complete `/dp/project.snapshot.json` remains available for AI and audit use.
- The DP technology summary uses accessible semantic bars; it does not load the general Recharts product-chart runtime for simple status counts.
- Hashed Starlight assets are immutable, while Pagefind and `/dp` outputs remain revalidated because their stable filenames change across releases.

No material implementation is complete while `/dp` is stale. Generated output must never silently replace the Markdown/frontmatter source; after a release, live `/dp` must report the exact released commit and Change Spec.
