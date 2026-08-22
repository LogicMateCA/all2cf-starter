---
id: shell-locale-route-metadata
title: Make Shell language and route metadata truthful
status: implemented
affectedModules: [product-shell, notifications, storage, assembler]
docsImpact: [PROJECT.md, DESIGN.md, features/product-shell/MODULE.md, features/notifications/MODULE.md, features/storage/MODULE.md, features/assembler/MODULE.md, /dp]
---

# Outcome

The saved English/Chinese preference now translates global Product navigation, account controls, Dashboard, notification chrome and the preference panel; it is explicitly a Shell language rather than a false claim that every product module is translated. React routes receive distinct browser titles, theme color is applied before hydration, and selected Object Storage is discoverable in navigation.

# Scope

- Add a small Starter-owned Shell dictionary with English fallbacks and Chinese global UI strings.
- Rename Language to Shell language and state that copied-product modules register their own translations.
- Add Files navigation only when `capability.object-storage` is materialized.
- Set route-specific document titles and pre-hydrate saved light/dark mode plus matching browser theme color.
- Correct current-state evidence language: Neumorphism is the historical visual acceptance reference; selected Editorial is not called visually verified until its own browser run passes.
- Extend authenticated browser acceptance to switch the settings surface to Simplified Chinese, verify global Workspace navigation and the `zh-CN` document language, capture evidence, then restore English.

# Verification

- Typecheck, production build, and authenticated browser acceptance, including the Simplified Chinese Shell interaction.

# Release

No release yet. Development and Production remain unchanged.
