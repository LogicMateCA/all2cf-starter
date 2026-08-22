---
module: storage
status: local-verified
source: starter
---

# Object storage module

Purpose: provide one optional, provider-neutral file-byte boundary without making storage a permanent dependency of every copied SaaS.

- Providers: `none` is the default; Cloudflare R2 is locally verified; S3-compatible is implemented and selectable but requires a real endpoint round trip in the copied project.
- Assembly: selecting storage also selects `capability.object-storage`. Materialization owns the Worker/Web/SQL files, generated adapter, Wrangler variables and R2 binding or S3 dependency/secrets. Deselecting it removes those receipt-owned assets safely.
- Runtime: PostgreSQL owns object metadata and soft-deletion state. R2 or S3 owns bytes. Object keys are server-generated under the authenticated user ID; clients cannot choose a bucket or key.
- Access: objects are private by default. Authenticated users can list, download and delete only their own metadata. A public read route returns only rows explicitly marked public.
- Upload policy: Worker-mediated uploads default to 10 MiB, reject empty bodies, invalid filenames and active HTML/SVG content, and compensate by deleting bytes if metadata insertion fails.
- Infrastructure: R2 uses the `OBJECTS` binding with distinct `starter-dev-objects` and `starter-objects` buckets. Environment-scoped provisioning reconciles only the requested bucket. S3 credentials are write-only and separate for Development and Production.
- Release gate: after deploy, the controller signs a fixed proof with the environment Better Auth secret and requires the live adapter to put, get, byte-compare and delete one `_starter/verification/` object. It then records the exact selected resource identity in local state; failed cleanup or identity mismatch fails the release.

Local Workerd evidence covers R2 private/public exact-byte round trips, anonymous denial, active-content denial and deletion against a disposable empty PostgreSQL database. S3 adapter types and both Worker dry-runs pass with a non-routable contract endpoint; real endpoint reachability, bucket policy, lifecycle rules, malware scanning, large direct uploads, CDN/public custom domains and Development/Production releases remain explicit product gates.
