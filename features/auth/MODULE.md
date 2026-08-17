---
module: auth
status: template
source: starter
---

# Auth module

Purpose: provide Web and Expo identity, product-specific sessions, organization membership, invitation, and platform-role boundaries through Better Auth.

- Identity provider: email/password, Google, Apple, and optional GitHub.
- Session/token boundary: Host-only Web cookies and Expo SecureStore integration.
- Roles and permissions: platform roles remain separate from organization roles.
- Sensitive data handling: provider credentials enter through the local development profile and Worker secrets.

All auth changes require explicit threat, migration, and rollback notes in a Change Spec. Keep states and permission behavior documented here.
