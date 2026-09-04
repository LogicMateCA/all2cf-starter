---
module: product-shell
status: local-verified
source: starter
---

# Product shell module

Purpose: own the permanent signed-in Web application frame so product modules register into one stable SaaS experience instead of creating new navigation and account chrome per project.

- Shell data ownership is shared: one Notification model feeds the Bell, Dashboard Recent Activity and notification center, while preferences remember the last persisted tuple so initial hydration is read-only.

- When `saas.onboarding` is materialized, Product Shell performs one authenticated status read before ordinary `/app` use and redirects incomplete accounts to the resumable onboarding route. It preserves a same-origin return path and deliberately leaves Settings, Support, Admin, public pages and authentication callbacks available.

- Structure: authenticated product routes share a responsive Sidebar and Topbar. The notification Bell stays immediately before the account control; mobile uses a keyboard-contained drawer that closes on Escape and restores focus to its trigger.
- Registration: `apps/web/src/lib/product-navigation.ts` is the current route and permission registry. Modules declare real routes, labels, search terms, required permissions and required materialized features. Navigation and search never invent unavailable destinations.
- Search: the first baseline searches registered product destinations locally. It is not a fake data search and does not call a Worker. Product-data search requires a separately owned API, authorization policy, indexing strategy and Change Spec.
- Workspace context: without the Organization pack the shell truthfully exposes only a Personal workspace. Organization selection may replace this seam with Better Auth Organization state; it must not create a second shell.
- Dashboard: `/app` keeps a stable product-module slot and derives Recent activity from the authenticated user's persisted notification records. It shows real support, billing, organization, security, announcement, and product events as their owning modules emit them; it never fabricates KPIs, revenue, user counts, or activity.
- Permissions: platform Admin visibility is derived from Better Auth's Admin role. Organization roles remain tenant-scoped and do not grant platform Admin access. Billing and Organization destinations appear only when their materialized routes exist.
- Styling: shell layout and behavior are Starter-owned. Visual values come from project-owned Visual Design output; the shell must not introduce a page-local theme.
- Localization: the persisted English/Chinese choice translates global Shell navigation, account, Dashboard, notification and preference chrome. Product modules own their own message catalogs and must not be represented as translated until those strings exist.
- Metadata: React routes set distinct document titles. Saved theme and browser theme color apply before hydration to avoid a light/dark flash.
- Donor boundary: Open SaaS commit `cbd30162b05d798b3a3f955ab5781940b67bec89` informs the application-shell and standard-flow structure. SaaSBoard commit `6cb1b4c84aec1adb8cfbc4df6e38b6717ca50382` informs Sidebar, Topbar, search, Bell and Dashboard interactions. Neither donor runtime, mock data or fixed styling enters the application.

The shell passed Web typecheck/build plus a disposable authenticated workerd matrix across desktop/mobile and light/dark modes. The last full visual matrix covered persisted Dashboard Recent activity, the notification Bell, account menu, mobile drawer and focus return, Settings, notifications, Support, Admin, axe checks, horizontal overflow, console/subresource failures and screenshot review under the Neumorphism acceptance adapter. The currently selected Editorial adapter still requires its own browser acceptance; product-specific navigation and read models remain copied-product acceptance work.
