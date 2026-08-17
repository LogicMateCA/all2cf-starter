# Bootstrap identity and evidence

## Identity map

Edit `starter.config.json`, then let `npm run identity:sync -- --reset` validate canonical-name removal and transactionally update its dependent identity files. Provision subsequently generates the Wrangler identities and concrete bindings:

- Project title and slug
- `.ai/manifest.json` project identity
- Development and Production Worker names
- Development and Production custom domains
- PostgreSQL database and role names for both environments
- Development container, host port, Tunnel, and VPC Service name
- Development and Production Hyperdrive names
- Wrangler `name`, `APP_ENV`, routes, and bindings
- `starter.manifest.json` environments and `cloudflare/bindings.contract.json`
- Expo slug, bundle identifiers, Android packages, schemes, and EAS project only when mobile is enabled

## Collision preflight

Use official Cloudflare MCP to inspect Workers, custom domains, VPC Services, Hyperdrive configurations, and any enabled R2/KV/Queue resources. A same-name resource is reusable only when its complete identity matches the new project's declared target. “Unconnected” does not mean unused.

Normalize the official MCP response into ignored `.all2cf/cloudflare-preflight-snapshot.local.json`, recording `absent`, `matching`, or `collision` for every declared Worker, domain, VPC Service, and Hyperdrive plus IDs for matching resources. Run `npm run cf:preflight:record -- --snapshot .all2cf/cloudflare-preflight-snapshot.local.json`. Provisioning rejects missing, stale, mismatched, incomplete, or collision-bearing evidence.

## Idempotency evidence

The second materialization and provision runs must retain:

- identical ignored environment-file hashes;
- identical generated per-project secret hashes;
- the same Development database/container identity and TLS state;
- the same Production database/role identity;
- the same VPC Service and Hyperdrive IDs;
- no unexpected tracked-file diff;
- no duplicate Cloudflare resources.

Never report a copied project initialized until its Development Worker is live and `/`, `/dp`, `/api/health`, `/api/version`, and `/api/health/database` return the declared identities.
