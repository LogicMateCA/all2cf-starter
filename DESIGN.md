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

## Workflow routing

- Product flows, UX audits, and visual exploration use the Product Design skill.
- Frontend visual direction and anti-generic taste use the applicable taste skill.

## Platform component strategy

- Web uses owned shadcn/ui components with Tailwind. Bklit remains available for advanced Web charts that exceed the ordinary shadcn Chart/Recharts layer.
- Expo owns a deliberately small component contract and token layer for primitives such as Button, TextField, Avatar, Menu, Sheet, Dialog, List, and feedback states. This is an adapter and template seam, not a from-scratch UI framework.
- Build native behavior from React Native and stable Expo capabilities first. Keep component APIs product-owned so different visual templates can replace presentation without rewriting authentication, navigation, accessibility, or analytics behavior.
- Tamagui is an optional mobile-template profile, not a base dependency. Select it only when a product will materially benefit from sharing styled components between Web and Native or from its compiler/theme system enough to justify Tamagui Provider, token, Metro/Babel, and monorepo configuration.
- Do not mix Tamagui and another full mobile UI system inside one template. A selected template has one primitive owner and may wrap third-party behavior behind the owned component contract.

## Placeholders

- Audience: `<placeholder>`
- Brand direction: `<placeholder>`
- Core journeys: `<placeholder>`
- Accessibility target: `<placeholder>`

## Change Spec

Record material interaction or visual-system changes in a Change Spec and keep this document and `/dp` source frontmatter aligned.
