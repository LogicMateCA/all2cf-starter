---
title: "Starter visual ownership contract"
status: "template"
source: "starter"
---

# Design

## Ownership boundary

- Starter does not own a visual language. It ships no StyleKit catalog, design profile, visual Pack, palette, typography system, surface treatment, imagery direction or motion grammar.
- The independent `visual-design` plugin is the sole visual owner. Its accepted project state lives under `.visual/`; the project repository owns the resulting source and receipt.
- Starter may emit only structural CSS and native tokens needed for operable layout, responsive behavior, focus visibility, readable defaults and accessibility before visual work begins.
- Structural output must use platform/system values and must not present itself as a brand or finished design. Product release requires separate visual acceptance.
- Visual MCP success is not implementation evidence. A visual result becomes active only after bounded project changes are reviewed and `.visual/receipt.json` records the accepted materialization.
- Visual being unavailable never blocks project creation, build or runtime. It does block claims that the product has completed visual design.

## Starter-owned interface behavior

- Starter owns information architecture, route behavior, permissions, validation, loading, empty, error and destructive-action states.
- Starter owns responsive and accessible behavior, not the aesthetic expression of those behaviors.
- Page and feature Packs define required content and interaction contracts without embedding a universal theme.
- Marketing, Auth, Product, Admin, Support, Setup, Docs and Mobile remain separate task surfaces. Visual Design may unify their brand language without replacing their behavior contracts.

## Readability and accessibility floor

- Normal body copy starts at `16px` on Web and equivalent native sizing on Expo. Operational descriptions, field help, navigation and table content target at least `14px`.
- Metadata, badges, timestamps and compact code labels have an absolute `12px` floor. Critical instructions and errors use at least `14px` and readable line height.
- Dense Admin and data layouts gain space through grouping, disclosure, scrolling or responsive reflow, never by shrinking text below the floor.
- Keyboard navigation, focus return, Escape dismissal, reduced motion, zoom/reflow and assistive-technology semantics require rendered acceptance evidence.

## Authenticated account shell

- Signed-out surfaces show a clear sign-in action; signed-in surfaces replace it with an avatar or initials trigger in the same region.
- The notification entry precedes the account trigger. The account menu owns identity and global preferences, not feature actions.
- Default destinations are Profile or Account, Settings, Help and Support, and Sign out. Admin appears only for authorized platform roles.
- Appearance supports System, Light and Dark. Language uses language names rather than flags.
- Web uses an accessible anchored popover; Expo uses an equivalent native sheet or screen while preserving the information architecture.

## Platform structure

- Desktop Web uses project-owned React/shadcn-compatible primitives. Optional chart renderers remain implementation details, not visual authorities.
- Mobile Web, iOS and Android use a separate Expo/Tamagui application. Web and Mobile do not share pages, navigation, layouts, UI components or presentation tokens.
- Platforms may share API/domain types, auth and permission contracts, localization keys, telemetry events and base brand assets accepted by Visual Design.
- Do not mix multiple full component systems on one target.

## Workflow

1. Starter materializes product behavior and structural layout from the Blueprint.
2. The controller invokes the installed Visual Design plugin for visual direction and bounded implementation.
3. Visual output is reviewed in real target browsers or devices, including responsive, accessibility and performance evidence.
4. The project records accepted visual state under `.visual/`; Starter never imports the Visual catalog into its own Blueprint.

## Project placeholders

- Audience: `<placeholder>`
- Brand direction: owned by `.visual/profile.json`
- Core journeys: `<placeholder>`
- Accessibility target: WCAG AA
