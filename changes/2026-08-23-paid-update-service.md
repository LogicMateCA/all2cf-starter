---
id: paid-update-service
title: Route generated-project updates through All2CF authorization
status: local-verified
affectedModules: [assembler, billing, entitlements, product-shell]
docsImpact: [PROJECT.md, ALL2CF_FACTORY.md, features/assembler/MODULE.md, skills/starter-maintenance/SKILL.md, /dp]
---

# Outcome

Portable generated products use an All2CF update-service URL and ignored local authorization receipt before resolving a private Engine. All2CF controls project binding, subscription entitlement, Channel selection and short-lived Artifact access; the local updater retains SHA-256, archive safety and product-file conflict protection.

# Boundaries

- GitHub is not an authoritative update source.
- All2CF does not receive local project source for status, diff or update.
- Browser UI cannot write project files; `/update` delegates to the local development server and CLI.
- Update authorization is local-only, ignored by Git and time-bounded.
- Production subscription uses Stripe Billing and Checkout/Portal rather than manual renewal logic.

# Verification

The Engine Channel contract proves unauthorized refusal, paid resolution through a project token, exact Artifact download, status/diff/add/update and managed-file conflict refusal. Starter Web typecheck and production build pass with `/update` emitted as a 4.32 kB lazy route. Factory and Change Spec contracts pass. The isolated All2CF API passes TypeScript; database migration execution, R2 provisioning and deployment remain separate release gates.

# Release

Not deployed. The All2CF integration remains isolated until separately reviewed.
