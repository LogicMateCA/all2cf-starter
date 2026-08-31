# Changelog

All notable public changes are recorded here. Detailed architecture decisions, alternatives and verification evidence remain under `changes/`.

The format follows Keep a Changelog and Semantic Versioning. Dates use ISO `YYYY-MM-DD`.

## [Unreleased]

### Added

- Nothing yet.

## [2.1.11] - 2026-08-31

### Added

- Route-addressable Admin control center navigation and a lightweight Analytics & Scripts publisher for external Providers.
- A same-origin cached Loader shared by Marketing, Web and Docs without a Starter-owned analytics event store.

### Changed

- Executable Admin modules now use stable routes grouped by Workspace, People, Engage and Operate; unselected Pack capabilities move to the Overview catalog.

### Fixed

- Admin modules no longer depend on in-memory tab state or expose optional/planned implementation placeholders in primary navigation.

### Performance

- The site-integration Loader is cached for 60 seconds and loads no external script when no destination is published.

### Security

- Admin, Auth, Setup, Factory and Maintenance routes are excluded from analytics loading; custom integrations accept only reviewed HTTPS script URLs and never inline code.
- Destination creation and publication write immutable revisions and privileged audit events transactionally.

### Migration

- Empty product databases add `app_site_integration` and `app_site_integration_revision`; no visitor events, pageviews or analytics sessions are stored by Starter.

## [2.1.10] - 2026-08-31

### Added

- A real prior-Stable functional update regression that verifies every owned marketing path, customer Page marker and Page CSS asset survives an applied update.
- Generated-project Skill reference closure checks that reject every `skills/*/SKILL.md` reference whose file was omitted by product shaping.

### Changed

- Release acceptance now upgrades an isolated prior-version project with its own lockfile and dependency volume before Stable promotion.

### Fixed

- Functional updates now skip frozen Page targets during both planning and file application; 2.1.9 planned the freeze correctly but still unlinked those files while applying.
- Legacy receipts now freeze prior `page.*` ownership and all existing `apps/marketing/` paths even when older Page metadata cannot be reconstructed.
- Web-only projects no longer retain a `PROJECT.md` requirement for the intentionally omitted Expo release Skill.

### Performance

- Existing verified source, candidate and public checkpoints remain reusable only when their exact immutable identity matches; the corrected Engine receives a new version and Artifact.

### Security

- True functional conflicts remain fail-closed while product Pages are excluded from the mutation set.

### Migration

- 2.1.9 was withdrawn from Stable after the live prior-version upgrade gate detected deleted marketing Pages. Upgrade to 2.1.10 instead; the 2.1.9 tag and Artifact remain immutable.

## [2.1.9] - 2026-08-31

### Added

- Checkpoint-based canonical release Skill covering source, candidate, Development, public and Production stages.

### Changed

- Later publication failures resume from the last matching source/version/SHA checkpoint instead of rebuilding verified Engine work.

### Fixed

- Damaged dependency volumes and temporary fixture receipt drift now have explicit recovery paths.

### Performance

- Verified candidate, Development and public checkpoints can be reused when their exact identities still match.

### Security

- Checkpoint reuse requires exact source commit, Engine version and Artifact SHA; identity changes force rebuild.

### Migration

- No product migration. This release supersedes the unpublished 2.1.8 candidate and includes its functional-only update policy.

## [2.1.8] - 2026-08-31

### Added

- Functional-only Starter maintenance updates that preserve existing product Page files and generated visual output.

### Changed

- Auth, Providers, MCP, Skills, Agent Map, migrations, runtime and functional modules remain updateable while Page templates stay frozen.

### Fixed

- Customer Page and CSS changes no longer become removal candidates during a functional foundation update.

### Performance

- Frozen Page artifacts are skipped without additional network requests or runtime dependencies.

### Security

- Functional-layer conflicts remain fail-closed; page freezing does not weaken protection for runtime, migration or configuration files.

### Migration

- Existing projects require no migration. The next authorized update advances the functional receipt while retaining current Page artifacts.

## [2.1.7] - 2026-08-31

### Added

- Installed Runtime stack versions on `/maintenance`, including Better Auth core and selected official adapters.

### Changed

- Pack versions and runtime dependency versions are displayed as separate ownership layers.

### Fixed

- Better Auth and framework versions are no longer hidden behind Starter Pack-only status.

### Performance

- Runtime versions are read from the local package lock during the existing status request; no additional request is added.

### Security

- The page reports only installed lockfile versions and never infers unavailable packages.

### Migration

- No database migration. Existing projects receive the Runtime stack panel through `foundation.core`.

## [2.1.6] - 2026-08-31

### Added

- Installed component Local/Cloud version comparison and Catalog-only version disclosure on `/maintenance`.
- Human-readable Will update, Will keep and Blocked conflicts groups backed by the real three-way update plan.

### Changed

- Check, diff, update, All2CF project, release details and disconnect now share one action toolbar above version evidence.

### Fixed

- Raw update JSON no longer obscures the files and components being changed.

### Performance

- Component versions reuse the existing update-status response and add no extra network request or runtime Pack.

### Security

- Update remains disabled before diff review and whenever the update plan reports a conflict.

### Migration

- No database migration. Existing connected projects receive the maintenance UI through `foundation.core`.

## [2.1.5] - 2026-08-30

### Added

- A product-shape regression check that explicitly rejects the platform Admin migration in Website/content output.

### Changed

- Foundation-managed files now obey the same output-shape filter as Pack-managed files.

### Fixed

- Website/content projects no longer retain `db/` after adding the platform Admin foundation.

### Performance

- Website output remains static-first without Worker or database runtime files.

### Security

- The first-Administrator migration remains mandatory for database-bearing Web SaaS and Mobile API products only.

### Migration

- 2.1.4 was not promoted to Stable. Use 2.1.5 for the platform Admin foundation.

## [2.1.4] - 2026-08-30

### Added

- Serialized first-account platform Administrator assignment for every registration path.
- `/admin` authority management backed by Better Auth's existing platform role model and database-level final-Administrator protection.

### Changed

- Existing databases with users but no platform Administrator promote the oldest account during migration.
- The Entitlements Pack advances to 0.2.0.

### Fixed

- Platform Administrators no longer require a product subscription to use paid product capabilities.

### Performance

- Administrator access reuses the existing role column and entitlement resolver; it adds no client runtime or additional request fan-out.

### Security

- PostgreSQL advisory locking prevents concurrent first registrations from creating ambiguous initial authority.
- The final platform Administrator cannot be demoted or deleted until another Administrator exists.

### Migration

- Apply `0010_platform_administrators.sql`. Existing role, subscription and organization records remain intact.

## [2.1.3] - 2026-08-30

### Added

- Nothing new.

### Changed

- Connected update routing now treats the project authorization receipt as the active service authority.

### Fixed

- An OAuth-connected project now uses the authorized project receipt's All2CF update-service URL before the source receipt fallback. Projects generated or tested against Development therefore connect and update through Production after Production authorization.

### Performance

- No runtime modules, Packs or client chunks were added.

### Security

- The project continues to accept only HTTPS update-service URLs from the validated, ignored authorization receipt.

### Migration

- Existing projects do not need file migration. Reconnect from local `/maintenance`; the new project authorization receipt selects the correct service origin.

## [2.1.2] - 2026-08-30

### Added

- Unified local `/maintenance` workspace for automatic All2CF MCP OAuth connection, paid entitlement, installed receipt, update preview and authorized application; manual Receipt import remains Advanced recovery.
- Setup completion choices for independent continuation or All2CF paid MCP and update connection.
- Codex-first automatic MCP connection and AI routing rules that identify the exact local page and preserve Token secrecy.
- Conservative Base/Local/Target incremental updates that preserve customer-only file and dependency changes and block simultaneous edits.

### Changed

- `/all2cf` and `/update` are compatibility aliases for `/maintenance`.
- All2CF Project plugin 0.1.3 routes paid Starter updates through hosted MCP OAuth plus a project-scoped connection receipt while native Cloudflare operations remain with official Cloudflare MCP.
- Maintenance diff reports safe changes, customer changes kept and conflicts before update application.

### Fixed

- Preserved customer-only Pack files, dependency versions and Agent Map content instead of treating every local difference as an overwrite candidate.
- Removed user-facing MCP Prompt copying from the normal connection flow and made manual Receipt import Advanced recovery only.

### Performance

- Kept unselected Packs Catalog-only so global release metadata can advance without adding project files, dependencies or runtime chunks.

### Security

- Added PKCE/state automatic connection, project-scoped Tokens, concurrent update locking, case-collision and symbolic-link refusal, compressed recovery snapshots and failed-verification rollback.

### Migration

- Existing projects can connect from local `/maintenance`; run Check updates and View diff before applying 2.1.2. Product-only changes are retained and simultaneous changes require explicit review.

## [2.1.1] - 2026-08-28

### Added

- Public full-source GitHub repository, stable packaged tar/zip assets, checksums and CI.
- URL-first `CODEX.md` handoff for creating a Cloudflare project from the repository URL.
- Six-step local Setup: Product, Modules, Providers, Pages, Design and Review.
- Essentials and Advanced Provider levels.
- Complete public page, Pack and Provider inventory plus independent Starlight Docs.
- Separate Stripe Development/Test and Production/Live credentials, links and client build environments.
- Optional legacy-project adoption into Agent Map and Starter maintenance contracts.
- Optional All2CF connected-project, MCP and managed-update contracts without runtime lock-in.

### Changed

- Positioned Starter specifically for the Cloudflare platform and Codex instead of generic full-stack or generic AI use.
- Presented 2FA, Organizations, API Keys, Billing and other product behavior as All2CF Starter Modules; Better Auth is named only as the authentication/session runtime or technical adapter.
- Removed the duplicate Capabilities Setup step; Provider `None`/implementation and SQL-first/Drizzle own optional capability selection.
- Renamed the SaaS-specific Setup step to product-neutral Modules for Web SaaS, content/website and Mobile App products.
- Reduced Product intent to the single Product identity brief; removed the duplicate brief, audience, core-object, tenancy, charging and automatic module-proposal fields.
- Widened desktop Setup to a 1540px canvas and four-column cards.
- Moved Maps and Object Storage exclusively into Providers.
- Marked independent AI visual design Under development and non-selectable while retaining the fixed functional baseline.
- New projects use native PostgreSQL/Hyperdrive; CFPG remains readable only for legacy receipts and is Planned/disabled.
- Public download and local Setup replace cloud Factory/Create/Generate as the primary user workflow.

### Fixed

- Corrected Core-to-Runner credential drift classification so a private Runner 401 is never shown as user `Unauthorized`.
- Preserved signed-in Draft ownership across generation and kept retryable failures recoverable.
- Prevented Setup from inheriting Chinese Product Shell locale or browser auto-translation.
- Separated Test and Live Stripe labels, secrets, webhook endpoints, Price IDs and publishable build values.

### Performance

- Full source retains every Pack template as build-time input while the minimal runtime proves `optionalPackCount: 0`.
- Unselected Packs contribute no realized files, dependencies, SQL, routes, Bindings, native modules or client chunks.
- Engine release verifies SQL-first, Drizzle and minimal products plus reproducible Artifact hashes.

### Security

- Public source builder neutralizes local domains, account IDs, infrastructure hosts and private mount paths, then runs a leak scan.
- Stripe secret/restricted keys and webhook secrets remain server-only and environment-isolated.
- Project-scoped All2CF tokens are optional, revocable and independent from user OAuth and Cloudflare authorization.

### Migration

- Existing users may keep `2.0.0-dev.39`; new projects should start from `2.1.1`.
- Re-run local `/setup` after updating so the six-step flow rewrites the reviewed Blueprint.
- Existing CFPG projects retain receipt compatibility, but new Setup no longer offers CFPG.
- Replace any copied single-environment Stripe configuration with separate Test and Live groups before Production release.

## [2.0.0-dev.39] - 2026-08-28

### Added

- First complete neutral GitHub source publication with README, Docs, AGPL/commercial licensing, release assets and public CI.
- Public source receipt and zero-optional-Pack baseline verification.

### Changed

- GitHub moved from a community placeholder to a contribution-ready source repository.

## [2.0.0-dev.38] - 2026-08-28

### Added

- Anonymous immutable Full Source download from All2CF.
- Connected Projects model for MCP and managed updates.

### Changed

- Cloud Factory configuration moved to local `/setup`.

## Historical development milestones

### 2026-08-28

- Simplified Product Features and Providers, made Maps Provider-owned, completed legacy adoption, published plugin `0.1.2`, added reproducible Full Source performance proof, and repaired Production Runner authorization drift.

### 2026-08-27

- Added AI-first positioning, dual AGPL/commercial licensing, feature registry/Agent Map lifecycle, foundation-bug upstream rules, multisurface Provider wizard, hosted project MCP boundary and unified email authentication flow.

### 2026-08-26

- Added generated SaaS integrity and operations-health selection authority.

### 2026-08-23 to 2026-08-25

- Added Engine Channels and paid project updates, source identity, optional All2CF connection, global project plugin, Visual product decoupling, Cloudflare control-plane preflight and explicit database-connector ownership.

### 2026-08-22

- Added Agent Map fast context, independent project Factory, source release/reproducibility, Drizzle product data, release integrity gates, static cache/bundle budgets and Development operations isolation.

### 2026-08-21

- Added selectable capability Packs for R2/S3, Turnstile, Workers AI, Vectorize, Expo Push, Twilio SMS, Images, Stream, Cron, Workflows and Durable Objects, plus Development-scoped provisioning and release-platform credentials.

### 2026-08-20

- Established complete SaaS foundation, Better Auth 1.7 baseline, Admin and Support operations, API Keys, Billing, Entitlements, Usage, Onboarding, Webhooks, Page Catalog, Design Engine and empty-database policy.

### 2026-08-17

- Established Web/Mobile foundation, authentication email Providers, account menu, dual UI strategy, operational Skills and always-current `/dp`.

[Unreleased]: https://github.com/LogicMateCA/all2cf-starter/compare/v2.1.11...HEAD
[2.1.11]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.11
[2.1.10]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.10
[2.1.9]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.9
[2.1.8]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.8
[2.1.7]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.7
[2.1.6]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.6
[2.1.5]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.5
[2.1.4]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.4
[2.1.3]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.3
[2.1.2]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.2
[2.1.1]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.1.1
[2.0.0-dev.39]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.0.0-dev.39
[2.0.0-dev.38]: https://github.com/LogicMateCA/all2cf-starter/releases/tag/v2.0.0-dev.38
