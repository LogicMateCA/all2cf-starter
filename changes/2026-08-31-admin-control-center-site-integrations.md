---
id: admin-control-center-site-integrations
title: Route Admin as a control center and publish lightweight external analytics
status: implemented
affectedModules: [admin, marketing, docs, product-shell]
docsImpact: [features/admin/MODULE.md, features/marketing/MODULE.md]
---

# Outcome

`/admin` is no longer a single local-state module catalog. Implemented Admin capabilities have stable URLs grouped into Workspace, People, Engage and Operate. Unselected Pack capabilities move to a capability catalog instead of occupying primary navigation with planned or optional placeholders.

`/admin/growth/analytics` manages external analytics destinations without building a Starter-owned analytics warehouse. The first release supports Cloudflare Web Analytics, Google Analytics, Google Tag Manager, Plausible and one reviewed external HTTPS script URL. Inline JavaScript is intentionally excluded.

Marketing, Web and Docs load one same-origin `/api/public/site-integrations.js` endpoint. It returns only published integrations for the current environment and requested surface, is edge-cacheable for 60 seconds, and fails open without breaking the product. Admin, Auth, Setup, Factory and Maintenance routes are excluded in the Loader itself. Visitor events travel directly from the browser to the selected Provider; Starter stores only configuration, immutable revisions and privileged audit events.

Provider validation records the CSP origins required for `script-src`, `connect-src` and `img-src`. Publishing a destination does not silently weaken the product CSP or add `unsafe-inline`.

# Verification

- `site-integrations:contract` proves the migration, five Provider adapters, three page surfaces, route exclusions, cached Loader and absence of Starter-owned pageview/event/session tables.
- Worker and application TypeScript checks cover the API payload and Admin UI.
- Marketing and Docs builds verify the shared Loader is included once per HTML document; Web includes it once at the application entry.
- Admin browser verification must cover desktop and mobile navigation, draft creation, publication, disable, CSP disclosure and zero horizontal overflow before release.
