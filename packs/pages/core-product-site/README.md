# Core Product Site Page Pack

This Starter-owned Astro pack adapts only the audited information architecture of PowerAI Astro. It contains no PowerAI branding, demo content, login behavior, runtime dependency, font, or asset.

The Blueprint selects individual routes. The materializer copies only those route files, while the selected Design Profile supplies generated tokens independently.

## Pinned PowerAI route inventory

The pack records all ten core source routes from PowerAI's pinned `src/pages` tree, including the generic dynamic route and the donor login/sign-up routes. The generic `[regular].astro` route is rejected because this Starter uses explicit owned routes and Starlight for content. PowerAI `login.astro` and `sign-up.astro` are replaced by the Better Auth React flow; their visual structure may inform the selected StyleKit adapter, but their behavior is not copied.

This pack currently materializes the static public subset. The source inventory is not an implementation claim: dynamic generic content remains planned, and the authentication donor is explicitly replaced.
