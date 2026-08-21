# Cloudflare release contract

| Intent | Target | Repository command | Remote mutation | Required result |
| --- | --- | --- | --- | --- |
| Build / verify | none | `npm run verify` | No | AI doctor, knowledge sync/check, types, build, and both Wrangler dry runs pass |
| 发布 / deploy / release | Development | `npm run release:dev` | Yes | Clean commit, verified artifact, `starter-dev`, `dev.logicm8.com`, bindings and five live checks |
| 正式发布 / production | Production | `npm run release:production` | Yes | Exact Development artifact parity, `starter`, `starter.logicm8.com`, bindings and five live checks |
| Roll back Development | Development | `npm run rollback:dev -- <version-id>` | Yes | Exact known-good version at 100% traffic and all five live checks |
| Provision / reconcile infrastructure | named environments | `npm run starter:provision` | Yes | Exact PostgreSQL, VPC service, Hyperdrive IDs, selected Queue identities, and generated Wrangler bindings |

## Evidence checklist

- User intent and selected target
- Git commit and clean-worktree result
- Artifact SHA-256
- Wrangler config and compatibility date
- Worker and custom domain
- Hyperdrive and other binding identities
- Selected Queue names/IDs and environment-specific secret-name requirements
- Deployment and version IDs from Cloudflare read-back
- `/`, `/dp`, `/api/health`, `/api/version`, and `/api/health/database` response status and target identity
- Failed checks or unresolved gates
- Known-good rollback deployment/version when relevant

Generated files and `.all2cf/*.local.json` are evidence caches, not the source of project architecture. Markdown/frontmatter remains the `/dp` source of truth.
