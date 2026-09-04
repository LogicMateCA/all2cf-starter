---
module: marketing
status: local-verified
source: starter
---

# Marketing module

Purpose: own the static-first public product site structure assembled from the Page Catalog; Visual Design owns its presentation.

- Content-hashed Marketing assets are immutable in the browser; HTML remains revalidated so a release can change references atomically.

- `apps/marketing` is an Astro application whose generated route files come only from selected Page Pack entries. The default Core Product pack produces Home, Features, Pricing, About, Contact, Changelog, Privacy, Terms, and a real 404 page.
- PowerAI Astro is a pinned information-architecture donor. Starter keeps provenance and license evidence but owns the resulting route templates, content boundaries, components, tokens, and maintenance.
- Public pages contain no required third-party JavaScript in the default build. They include one small same-origin site-integration Loader; with no published destination it performs no external script load. Product authentication and application routes remain in the separate React application and are served through the same Worker under explicit route boundaries.
- Starter materializes Marketing structure without selecting a visual profile. Visual Design owns the project-specific Marketing language and records accepted output under `.visual/`.
- Placeholder content is intentionally honest. Pricing, legal text, testimonials, metrics, integrations, careers, and contact delivery do not become real merely because a route exists; project configuration and acceptance evidence must promote each surface separately.
- Optional Growth routes are absent until their individual Page Catalog entries are selected. The executable pack owns schema-validated content collections, every index/detail route, Blog and Case Study pagination, Blog RSS, honest noindex samples, and explicit integration/application availability gates. Project content, configured destinations and final metadata remain copied-product release gates.
- Design and Page changes do not touch PostgreSQL. Every copied product starts with separate new empty Development and Production databases initialized from the final selected SaaS baseline.

The reusable core and optional Growth route layers are locally verified. A disposable all-family materialization passed Astro typecheck, schema validation, a 17-route static build, 32 desktop/mobile light/dark browser cases and screenshot review, then cleanly restored the default Growth-absent build. Copied projects still owe truthful product content, functional contact/application delivery, final metadata and product evidence.
