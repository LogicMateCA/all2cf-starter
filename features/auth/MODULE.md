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
- Global account entry: every authenticated primary surface exposes the active avatar or initials at the upper right. The menu contains identity, account/settings, System-Light-Dark appearance, language, conditional Admin, help/support, and sign out.
- Preference ownership: signed-in theme and locale belong to the user profile and synchronize across Web and Expo; signed-out preferences remain device-local defaults.
- Accessibility: the account trigger has an explicit accessible name, menu focus is trapped/restored correctly, and every action is reachable by keyboard or native assistive technology.

All auth changes require explicit threat, migration, and rollback notes in a Change Spec. Keep states and permission behavior documented here.
