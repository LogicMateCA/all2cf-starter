# Project context source map

| Concern | Canonical source | Derived evidence |
| --- | --- | --- |
| Product purpose and current state | `PROJECT.md`, `starter.manifest.json` | `/dp` overview |
| Feature ownership and status | `features/<module>/MODULE.md` | `/dp` module catalog |
| Material change outcome and gates | `changes/<id>.md` | `/dp` current changes |
| Runtime topology and boundaries | `ARCHITECTURE.md`, `cloudflare/bindings.contract.json`, Wrangler configs | `/dp` topology and MCP read-back |
| AI roles and permissions | `AGENTS.md`, `.ai/manifest.json`, `.ai/orchestration.yaml` | `ai:context` orchestration |
| UI rules and templates | `DESIGN.md` and selected template assets | built Web/Expo UI |
| Performance requirements | `PERFORMANCE.md` | measurements and release evidence |
| Release authorization and gates | `RELEASE.md`, operational release skills | `.all2cf/*.local.json` and live provider IDs |
| Dependency policy | `dependency-policy.json`, `runtime-upgrade` skill | registry checks and verified releases |

Status vocabulary must distinguish `planned`, `template`, `implemented`, `local-verified`, `development-verified`, `production-released`, and explicit unverified/blocked states. Local cache, HTTP 200, generated output, and historical chat are not authoritative by themselves.
