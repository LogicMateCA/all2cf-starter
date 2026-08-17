---
id: dual-ui-foundation
title: Separate Desktop and Mobile UI foundations
status: local-verified
affectedModules: [mobile, auth, admin, docs]
docsImpact: [ARCHITECTURE.md, DESIGN.md, features/mobile/MODULE.md, starter.manifest.json, /dp]
---

# Outcome

Desktop Web can optimize for mouse, keyboard, large-screen density, dashboards, and complex data workflows, while one separate Expo application can optimize Mobile Web, iOS, and Android for touch-first navigation and presentation.

# Scope

- Keep `apps/web` as an independent Vite application using shadcn/ui and Tailwind.
- Route ordinary Desktop charts through the owned shadcn Chart component layer; Recharts remains its underlying rendering dependency, Bklit remains available for advanced Web charts, and ECharts stays opt-in.
- Enable `apps/mobile` for Mobile Web, iOS, and Android with Expo Router and Tamagui.
- Keep Desktop and Mobile pages, layouts, navigation, components, and presentation tokens separate.
- Share only API contracts, domain types, auth/permission contracts, i18n keys, telemetry events, and base brand assets.

# Verification

- Desktop Web shadcn Chart source, typecheck, and Vite production build.
- Expo dependency compatibility, Expo Doctor, TypeScript, and Mobile Web/iOS/Android production exports.
- Confirm no shared UI or screen package exists between Desktop and Mobile.
- Record bundle sizes and Tamagui compiler status without claiming unmeasured performance gains.

Verified results:

- shadcn CLI initially wrote to a literal `@/` directory until the monorepo root tsconfig alias was declared; the corrected CLI run generated owned `card.tsx` and `chart.tsx` sources.
- TypeScript 7 rejected the removed `baseUrl` option; aliases now use TS7 `paths` plus the Vite alias.
- Desktop main JS remains 65.25KB gzip; the shadcn/Recharts chart is a lazy 112.29KB gzip chunk.
- Full Tamagui barrel plus default config produced 532KB gzip Mobile Web and roughly 3.7/4.0MB iOS/Android bundles, so it was rejected.
- Package-level Tamagui imports plus a minimal owned configuration produced 355.48KB gzip Mobile Web, 2.71MB iOS, and 3.01MB Android output.
- Expo Doctor passed 21/21 and Web/iOS/Android exported successfully. Mobile Web returned HTTP 200 from the production export.
- Tamagui Compiler 2.7.7 is incompatible with the current TypeScript 6/7 API and remains disabled. Chrome DevTools MCP could not create a browser target, so Lighthouse and runtime browser inspection remain unverified.
- Automated bundle gates now enforce Desktop main/chart, Mobile Web, iOS, and Android ceilings during repository and mobile verification.

# Release

Local verification is complete. Development release evidence will be recorded after the combined repository checks and commit pass.
