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

## Readable typography floor

- Normal body copy starts at `16px` on Web and equivalent native sizing on Expo. Operational descriptions, field help, navigation and table content target at least `14px`.
- Metadata, badges, timestamps and compact code labels have an absolute `12px` floor. Text below `12px` is prohibited across Marketing, Auth, Product, Admin, Support, Setup, `/dp`, Docs, Mobile and optional pack templates; hiding a textual label uses accessible icon-only behavior rather than unreadable type.
- Small text never carries the only explanation of a choice, validation error, release blocker or save state. Critical instructions and errors use at least `14px`, readable contrast and `1.45` or greater line height.
- Dense Admin and data layouts gain space through grouping, disclosure, horizontal scrolling or responsive reflow, never by shrinking text below the floor.
- `typography:contract` mechanically scans Web, Mobile, Marketing, Docs and pack source for forbidden literal sizes. Browser zoom, reflow, contrast and assistive-technology behavior remain separate acceptance evidence.

## StyleKit-controlled Design Engine

- StyleKit is the pinned design-source library, not a small inspiration library. Its 146 audited entries include whole-site systems, layouts, effects/components and narrow references. Starter classifies them explicitly; `/setup` exposes only reviewed `global-system` entries as the base style and creates a Starter-owned immutable snapshot for the selected slug and revision.
- Layout and enhancement entries never replace the global style lock. They are optional composable layers with declared compatible surfaces, requirements and conflicts. `reference-only` entries remain AI-readable inspiration and cannot enter an executable Blueprint.
- A snapshot includes provenance and source hashes, complete semantic and component tokens, typography, spacing, radius, light/depth rules, interaction states, recipes, AI do/don't rules, required/forbidden patterns, reference assets, accessibility requirements and per-surface adapter status.
- Generated projects pin the owned snapshot version and never call a StyleKit runtime or API. New upstream styles or changes do not affect an existing project until an explicit reviewed refresh creates a new snapshot.
- A selectable style must have an owned adapter compiler, not merely an eligibility label. Twenty-eight deliberately distinct whole-product systems now have immutable snapshots and compile through nine active structural families plus optional style-signature layers into separate React Web, Astro Marketing and Starlight Docs component layers after the shared token layer; `stylekit:boundary` rejects local gradients, literal colors and non-semantic shadows that would bypass the lock.
- Before visual work, AI reads the style lock, manifest, rules, target adapter, registered recipes, page/function contract and `/dp` lifecycle evidence. Knowing only the style name is insufficient.
- Marketing, Auth, Product, Admin, Docs, Setup and DP use one selected visual language. They may change information density and layout for their task, but not the style's color, typography, shape, light/depth, component-state and motion grammar.
- Page code composes registered semantic primitives. Direct colors, shadows, radii, global themes and page-local component systems are rejected unless added to the selected style recipe contract.
- Required primitives cover navigation, responsive shell, surface, button, input, selection, account menu, notification bell/inbox, card, table, form, dialog, tooltip, toast, badge, chart frame and loading/empty/error/permission states.
- The old Owned Neutral, Precision SaaS, Editorial Signal and Midnight Control profiles remain compatibility references only. New products select one of the 28 curated StyleKit whole-product snapshots; a close style variant, source-native layout, Admin density mode or enhancement is selected independently and cannot override that lock.
- PowerAI Astro supplies audited page structure and component ideas for owned Page Packs. Its original brand, theme, content, and repository relationship are removed after adaptation; only license and provenance remain.
- Page choice is independent from visual profile choice. `pages/catalog.json` defines the route, renderer, required state, section intent, and acceptance criteria; the selected Design Profile supplies presentation without changing product behavior.
- One selected snapshot deterministically produces coherent but surface-appropriate outputs for Astro Marketing, Better Auth, shadcn Product/Admin, Starlight Docs, Setup and DP. Expo keeps a separate native template and may inherit approved brand semantics without sharing Web CSS or DOM components.
- The target Design Compiler extracts and validates the selected snapshot, then compiles only the adapters needed by the product. Offline gates require provenance, deterministic hashes, complete interaction states, reduced motion, accessibility, direct-style boundary checks and no StyleKit or PowerAI runtime dependency.
- Core semantic color pairs are measured in both modes at `4.5:1` minimum, including ordinary and strong surfaces. Snapshot `2.2.0` checks 728 foreground/muted/accent/danger pairs across all 28 systems. This proves token-level WCAG AA contrast only; rendered controls, images, focus states, zoom/reflow, keyboard behavior, and assistive-technology semantics still require browser evidence.
- Open Design and RunCopilot are research and extraction aids. They may inform a Change Spec but are not dependencies or design authorities.
- `neumorphism` is the first acceptance slice for the new compiler. It must preserve fixed light direction, dual-shadow raised/recessed/pressed semantics and its forbidden visual patterns while adding visible focus, contrast-safe error/disabled/selected/unread states, independently designed dark mode, reduced motion and readable dense Admin tables. Real browser evidence is required across every Web surface before it can be called verified.
- The pinned 146-entry inventory is fully classified: 28 deliberately distinct global systems, 35 composable style variants, 18 layouts, one Admin density pattern, 11 enhancements and 53 reference/content-specific entries. Every global system has an immutable `2.2.0` snapshot, a real pinned source-cover preview and a compiler contract. Neutral target adapters no longer inject Neumorphism into every style; culturally specific and high-expression systems add owned signature rules. Neumorphism remains the locally browser-verified acceptance reference across Marketing, Auth, Product, Admin, Support, Docs, Setup, DP and disposable Growth surfaces; the current Editorial selection and other systems remain contract-verified until separately visually accepted.
- `editorial@2.2.0` is the reusable Starter default because it provides a stable black/white SaaS hierarchy across Marketing, Auth, Product, Admin, tables, charts, Docs and Expo without tying every copied product to purple glass, blue full-page surfaces, decorative depth or a culture-specific visual grammar. Light mode uses a white canvas and dark mode uses a near-black canvas; restrained red is reserved for actions and state. Style is an initialization decision, not a routine setting.
- Web applies the saved theme before React hydration and keeps the browser `theme-color` synchronized. Route metadata is route-specific rather than inheriting the `/dp` title across Login, Product, Support, Admin and Setup.

## Authenticated account shell

- Follow the familiar Google account pattern: signed-out surfaces show a clear sign-in action at the upper right; signed-in surfaces replace it with a circular profile photo or initials button in the same position.
- Keep the account menu separate from primary product navigation. It owns identity and global preferences, not feature actions.
- Place the notification bell immediately before the signed-in account trigger. It owns unread count, a short event preview and a route to the full notification center; it is not embedded inside the account menu.
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
- Every Design or Page pack carries reference screenshots, target-specific empty/loading/error states, accessibility gates, and performance budgets before it can become `local-verified`. A locally verified Design Profile does not automatically promote every target adapter or every Page Catalog entry.

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
