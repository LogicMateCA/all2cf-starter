---
module: admin
status: template
source: starter
---

# Admin module

Purpose: provide a separate platform workspace for users, organizations, subscriptions, support, operational failures, and audited interventions.

- Admin roles: Better Auth platform roles, independent of organization membership.
- Audit events: append-only records for every privileged mutation.
- Approval boundaries: project-specific destructive actions require explicit intent.
- Emergency access and rollback: release identity and runbook are recorded before use.

Privileged actions must be explicit, auditable, and covered by a Change Spec before release.
