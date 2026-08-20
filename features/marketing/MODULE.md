---
module: marketing
status: implemented
source: starter
---

# Marketing module

Purpose: own the static-first public product site assembled from the Page Catalog and the selected Design Profile.

- `apps/marketing` is an Astro application whose generated route files come only from selected Page Pack entries. The default Core Product pack produces Home, Features, Pricing, About, Contact, Changelog, Privacy, Terms, and a real 404 page.
- PowerAI Astro is a pinned information-architecture donor. Starter keeps provenance and license evidence but owns the resulting route templates, content boundaries, components, tokens, and maintenance.
- Public pages contain no required client JavaScript in the default build. Product authentication and application routes remain in the separate React application and are served through the same Worker under explicit route boundaries.
- The selected Design Profile generates Marketing tokens at materialization time. StyleKit-derived profiles are Starter-owned adaptations and never introduce a StyleKit runtime or automatic upstream synchronization.
- Placeholder content is intentionally honest. Pricing, legal text, testimonials, metrics, integrations, careers, and contact delivery do not become real merely because a route exists; project configuration and acceptance evidence must promote each surface separately.
- Optional Growth routes are absent until their individual Page Catalog entries are selected. Their index templates remain `implemented`; content collections, detail routes, RSS, metadata, and product evidence remain acceptance gates before local verification.
- Design and Page changes do not touch PostgreSQL. Every copied product starts with separate new empty Development and Production databases initialized from the final selected SaaS baseline.

Local verification requires route presence and absence checks, responsive visual evidence, keyboard and accessibility checks, real 404 behavior through workerd, and the documented performance budgets. A build alone leaves the module at `implemented`.
