---
module: support
status: template
source: starter
---

# Support module

Purpose: provide organization-scoped support tickets, message threads, product bug reports, attachments, and an administrator inbox.

- Intake channel: Web and Expo forms with CFsend notifications.
- Ownership/SLA: project-specific and visible in the support runbook.
- User-visible states: open, waiting, resolved; bugs add triaged, in progress, fixed, and closed.
- Data retention: PostgreSQL metadata and private R2 attachments.

Document escalation, privacy, and operational changes in a Change Spec.
