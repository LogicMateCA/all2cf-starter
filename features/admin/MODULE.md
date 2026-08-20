---
module: admin
status: template
source: starter
---

# Admin module

Purpose: provide a small authenticated product-operations shell whose sections are added only when their owning SaaS modules are selected.

- Initial scope: authorized user lookup, lightweight support and bug inbox, subscription readback when Billing is selected, operational failures, and the smallest necessary intervention controls.
- Admin authority: use Better Auth's Admin plugin and permission model where it fits. Keep platform authority independent of optional organization membership.
- Audit events: append-only records for privileged mutations; read-only screens do not create artificial audit noise.
- Optional sections are absent until their module is selected. `/admin` is not the `/setup` configurator and is never a general-purpose back-office framework.
- Approval boundaries: project-specific destructive actions require explicit intent.
- Emergency access and rollback: release identity and runbook are recorded before use.

Privileged actions must be explicit, auditable, and covered by a Change Spec before release.
