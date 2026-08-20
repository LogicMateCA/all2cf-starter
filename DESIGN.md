---
title: "Starter design contract"
status: "template"
source: "starter"
---

# Design

## Product principles

- Make the primary task obvious and reversible.
- Prefer accessible, responsive defaults and explicit loading, empty, error, and permission states.
- Reuse the established design system before introducing new visual primitives.

## Owned Design Engine

- Starter owns the design profiles used by generated projects. A profile includes semantic tokens, typography, spacing, radius and elevation rules, interaction states, page recipes, asset direction, accessibility requirements, and per-target adapters.
- StyleKit is a candidate library of source ideas and recipes. Accepted styles are manually imported from a pinned revision, normalized into Starter's schema, adapted for each target, reviewed with Product Design and Taste, visually compared, accessibility checked, performance tested, and released as a new internal catalog version.
- Generated projects pin an internal profile version and never call a StyleKit runtime or API. New upstream StyleKit styles do not alter existing projects automatically.
- PowerAI Astro supplies audited page structure and component ideas for owned Page Packs. Its original brand, theme, content, and repository relationship are removed after adaptation; only license and provenance remain.
- One selected profile must produce coherent but platform-appropriate outputs for Astro marketing pages, shadcn Desktop Web and Admin, Starlight Docs, and later a Tamagui brand seed. Desktop and mobile still retain separate components and layouts.
- Open Design and RunCopilot are research and extraction aids. They may inform a Change Spec but are not dependencies or design authorities.

## Authenticated account shell

- Follow the familiar Google account pattern: signed-out surfaces show a clear sign-in action at the upper right; signed-in surfaces replace it with a circular profile photo or initials button in the same position.
- Keep the account menu separate from primary product navigation. It owns identity and global preferences, not feature actions.
- Start the menu with the active avatar, display name, and email. When multi-account or organization switching is supported, place it directly below the identity header rather than mixing it into settings.
- Default destinations are Profile or Account, Settings, Help and Support, and Sign out. Show Admin only to authorized platform roles; never expose it as a disabled teaser.
- Provide a three-state appearance preference: System default, Light, and Dark. System default is the initial choice. Apply changes immediately without a page reload.
- Provide a language selector using language names in their own language, not country flags. Update the interface immediately and preserve the choice for the signed-in account.
- Separate Sign out visually from ordinary destinations and keep it one deliberate action; destructive account deletion belongs inside Settings and requires its own confirmation flow.
- Web uses an anchored account popover with keyboard navigation, focus return, outside-click handling, and Escape dismissal. Expo uses an equivalent native sheet or settings screen while preserving the same information architecture.
- Account-level theme and language should follow the user across Web and Expo when signed in. Before authentication, use device/system defaults and retain only a local preference.
- The implemented Desktop flow follows A2C's proven state progression, not its legacy visual styling: identify email, choose password/registration/linked-provider setup, use generic email-result states, handle reset tokens, and return only to a validated same-origin path.
- The Desktop account trigger and menu use owned shadcn/ui components. Authentication SDK, protected routes, and menu primitives are route/lazy chunks so public pages do not pay their full JavaScript cost.

## Workflow routing

- Product flows, UX audits, and visual exploration use the Product Design skill.
- Frontend visual direction and anti-generic taste use the applicable taste skill.
- `/setup` recommends a small set of compatible design profiles from the product brief. The user selects one; AI records it in the Blueprint before materializing pages.
- Every Design or Page pack carries reference screenshots, target-specific empty/loading/error states, accessibility gates, and performance budgets before it can become `local-verified`.

## Platform component strategy

- Desktop Web uses owned shadcn/ui source components with Tailwind. Ordinary charts use the owned shadcn Chart component layer; Recharts remains its internal renderer and must not be imported directly by feature code. Bklit remains available for advanced Web charts, with ECharts opt-in for heavy analytics.
- Mobile Web, iOS, and Android use a separate Tamagui 2 component and token system. Use package-level Tamagui imports rather than the full `tamagui` barrel to control bundle size.
- Desktop and Mobile do not share pages, navigation, layouts, UI components, or presentation tokens. Share behavior contracts and base brand assets only.
- The Mobile base carries only minimal light/dark themes, spacing, sizing, typography, and required component subthemes. Product templates extend this baseline rather than importing hundreds of unused default themes.
- Tamagui Compiler is not enabled while Tamagui 2.7.7 depends on TypeScript APIs removed in the Starter's supported TypeScript 6/7 toolchain. Runtime-only builds are the verified baseline; enable compiler optimization only after upstream compatibility and measured release evidence.
- Do not mix Tamagui with another full mobile UI system. Platform-native controls may be wrapped only when their behavior materially improves the product.

## Placeholders

- Audience: `<placeholder>`
- Brand direction: `<placeholder>`
- Core journeys: `<placeholder>`
- Accessibility target: `<placeholder>`

## Change Spec

Record material interaction or visual-system changes in a Change Spec and keep this document and `/dp` source frontmatter aligned.
