---
module: admin
status: local-verified
source: starter
---

# Admin module

Purpose: provide a small authenticated product-operations shell whose sections are added only when their owning SaaS modules are selected.

- Implemented scope: `/admin` provides Better Auth user readback plus the lightweight support and bug inbox. Organization and Billing capabilities materialize their own product routes first; project-specific Admin readback remains absent until a real operations need defines it.
- Admin authority: Better Auth's official Admin plugin owns the `admin` platform role and identity endpoints. The Starter UI does not create a second role model. Optional organization membership never grants platform Admin access.
- Audit events: support status changes append actor, action, target, metadata, and time to `app_admin_audit_event`; read-only screens do not create artificial audit noise.
- Current UI intentionally exposes user readback rather than every destructive Admin endpoint. Ban, role, session-revocation, and impersonation APIs are upstream-owned and should receive product-specific UI only when a real project needs them.
- Optional sections are absent until their module is selected. `/admin` is not the `/setup` configurator and is never a general-purpose back-office framework.
- Approval boundaries: project-specific destructive actions require explicit intent.
- Emergency access and rollback: release identity and runbook are recorded before use.

Local workerd verification proves ordinary-user denial, Admin-only user and ticket readback, ticket-state mutation, and exactly one matching audit event against a newly created temporary database. Remote release remains unverified. Privileged actions must be explicit, auditable, and covered by a Change Spec before release.
