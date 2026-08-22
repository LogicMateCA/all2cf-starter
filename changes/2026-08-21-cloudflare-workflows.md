---
id: cloudflare-workflows
title: Add optional Cloudflare Workflows skeleton
status: local-verified
affectedModules: [assembler, background, admin, operations]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/background/MODULE.md, features/admin/MODULE.md, features/operations/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select an environment-isolated Cloudflare Workflow with a durable two-step skeleton, Admin-only create/status API, optional binding schedule, local lifecycle evidence and remote resource cleanup on deselected release.

# Scope

- Generate the Workflow class export, feature routes, Binding/resource name and optional environment schedules only while selected.
- Keep the Starter Workflow payload/steps fixed and bounded; copied projects replace them rather than executing arbitrary code or choosing classes at runtime.
- Add read-only health and Setup controls.
- Record selected Workflow identity after release; when a later release deselects it, deploy without the class/Binding first, then delete the exact recorded remote Workflow through Cloudflare API if it still exists.

# Verification

- Wrangler local CLI triggered an instance with parameters; both durable steps completed and returned requestedBy/correlation/status output.
- Disposable Workerd auth evidence proves ordinary-user Admin denial plus Admin create/status/output completion after the temporary Worker entry was corrected to re-export `StarterWorkflow`.
- Selected types/dry-runs show different environment resource names; deselection removes feature, Binding, generated class export and variables, then default regression passes.
- Setup browser acceptance passed all 4 cases with 8 screenshots and artifact SHA `fccc0bd32027d4012163e69b4c88ad676f7029dc7cf47067fd65356b8b0e21db`.
- The remote deletion implementation is idempotent by listing exact resources before DELETE, but no prior deployed Starter Workflow existed to exercise real remote deletion. Development remains required.

# Release

No Worker release. Current Blueprint leaves Workflows unselected. Development acceptance needs deployed create/status and a real deselect/release deletion drill; Production remains unchanged.
