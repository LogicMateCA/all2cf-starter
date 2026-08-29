---
id: mobile-ui-strategy
title: Thin owned Expo UI seam with optional Tamagui template
status: superseded
affectedModules: [mobile, auth]
docsImpact: [DESIGN.md, features/mobile/MODULE.md, starter.manifest.json, /dp]
---

# Outcome

Expo products can select different mature visual templates without coupling authentication, navigation, accessibility, analytics, or business flows to one third-party component system.

# Scope

- Keep React Native and stable Expo primitives as the base behavior layer.
- Define a small product-owned component and token interface rather than building a full UI framework.
- Keep Tamagui 2.x as an optional complete template profile for products that justify its Web/Native sharing and compiler/theme setup.
- Keep Web on shadcn/ui/Tailwind and avoid introducing Tamagui solely for mobile when no cross-platform component sharing is planned.

# Verification

- Before selecting a default Expo template, implement the same representative authentication, account menu, form, list, modal/sheet, loading, empty, error, and chart screens in candidate profiles.
- Compare Expo Doctor, iOS/Android export, native fingerprints, bundle/startup cost, accessibility, AI editability, and visual quality.
- A selected template must pass the real mobile verification and release workflow; package installation alone is insufficient.

# Release

Superseded by `dual-ui-foundation` after the product owner selected separate Desktop shadcn/ui and Mobile Web/iOS/Android Tamagui foundations. This record remains as decision history.
