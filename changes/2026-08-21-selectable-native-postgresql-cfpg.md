---
id: selectable-native-postgresql-cfpg
title: Select native PostgreSQL or CFPG during Setup
status: implemented
affectedModules: [assembler, auth, operations, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/operations/MODULE.md, cloudflare/bindings.contract.json, dependency-policy.json, /dp]
---

# Outcome

`/setup` can select either native PostgreSQL through Hyperdrive or CFPG through the All2CF Database Service Binding without changing application SQL or introducing an ORM.

# Scope

- Keep PostgreSQL as the SQL engine and record `native-postgresql` or `cfpg` as the runtime Provider in the Project Blueprint.
- Accept the exact All2CF `npx @all2cf/database-connect@0.2.0-rc.2 db_...` command separately for Development and Production, resolve it through the fixed All2CF install API, and persist the validated database ID, Worker, entrypoint, package alias, version and SHA-256. The database ID is not treated as a secret.
- Preserve the supplied Development command for `db_bf5ecb97acc443a1bfa17d09319082c3`; leave Production deferred so the two environments cannot silently share one mutable database.
- When CFPG is materialized, receipt-own the exact `@all2cf/database-connect` Worker dependency, `pg` alias, `ALL2CF_DATABASE` Service Binding and removal of the corresponding Hyperdrive binding in each Wrangler environment. Switching back restores the receipt-owned Hyperdrive configuration and removes the CFPG dependency/binding.
- Keep Setup save side-effect-free with respect to npm, Cloudflare and database state. It validates and records commands; the existing reviewed materialization step owns package/config changes and still does not deploy.
- Route Worker database creation through one Provider-aware factory so the same SQL-first source runs with Hyperdrive or the CFPG alias.
- Require optional Queue consumers such as Outgoing Webhooks to use the same Provider-aware database factory; no selected pack may reach `env.HYPERDRIVE` directly.
- Record `0.2.0-rc.2` as an explicit reviewed prerelease exception because it is the only published connector and current npm `latest`, rather than weakening the repository-wide stable-only policy.

# Verification

- Resolve the supplied Development command against `https://app.all2cf.com/api/database/install/<database-id>` and verify descriptor schema 2, package/version/SHA, alias and `ALL2CF_DATABASE` target.
- Run `database:provider:contract` for exact-command parsing, descriptor validation, CFPG config generation and lossless native-Hyperdrive restoration.
- Verify local Setup GET/PUT persistence, Blueprint validation, Web/Worker type checks, dependency contracts, materialization planning, knowledge synchronization and builds. The CFPG trial plan adds the exact Worker dependency, and container-run Wrangler dry-runs compile both CFPG environments with `pg` aliased and only `ALL2CF_DATABASE` present; the Development binding uses the resolved real Worker, while the isolated Production dry-run uses a synthetic distinct descriptor and does not claim a live database.
- Both unchanged native PostgreSQL/Hyperdrive Worker configurations also pass Wrangler dry-run, and the complete native workerd authentication smoke flow remains green after the Provider-aware database factory change.
- A real CFPG materialization, schema initialization, Development query/auth flow and release remain blocked until a distinct Production CFPG command is supplied and the owner intentionally selects CFPG.

# Release

The Provider-aware runtime is released to Development while the live selection remains native PostgreSQL/Hyperdrive. CFPG command capture remains local Setup behavior, and a real CFPG query/auth release is still unverified. Production remains unchanged.
