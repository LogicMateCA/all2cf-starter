---
id: account-menu-foundation
title: Google-style authenticated account and settings entry
status: planned
affectedModules: [auth, admin, support, mobile]
docsImpact: [DESIGN.md, features/auth/MODULE.md, /dp]
---

# Outcome

After sign-in, every primary Web and Expo surface exposes a familiar upper-right account entry that gives users a consistent path to identity, settings, appearance, language, support, authorized administration, and sign out.

# Scope

- Define signed-out and signed-in upper-right account states.
- Define the account menu information architecture and role-gated Admin entry.
- Define System, Light, and Dark behavior plus signed-in cross-client preference persistence.
- Define locale selection and Web/Expo presentation parity without selecting the final visual template.

# Verification

- Verify keyboard, focus, Escape, screen-reader labels, outside-click, and responsive behavior on Web.
- Verify equivalent native navigation and assistive-technology behavior on Expo.
- Verify theme and locale before login, after login, across refresh/relaunch, and across Web/Expo sessions.
- Verify unauthorized users never receive an Admin destination and sign out clears the product session.

# Release

This is an interaction contract only. Implementation and Development release evidence will be added with the real Better Auth account shell.
