---
id: factory-source-capsule
title: Allow immutable Factory source capsules without Git history
status: implementing
affectedModules: [assembler, operations]
docsImpact: [ALL2CF_FACTORY.md, features/assembler/MODULE.md, skills/starter-factory/SKILL.md, /dp]
---

# Outcome

All2CF can execute the exact canonical Factory source from a hash-verified Git archive that deliberately excludes `.git`. The trusted job manifest injects the original 40-character source commit; the Factory records that identity as clean without fabricating repository history.

# Scope

- Accept `STARTER_FACTORY_SOURCE_COMMIT` only when it is an exact lowercase Git SHA-1.
- Use normal live Git identity and dirty-tree refusal when the variable is absent.
- Treat an injected immutable source capsule as clean; artifact SHA-256 validation remains the caller's responsibility.
- Add a hosted portable mode that removes canonical infrastructure identity before project handoff.
- Remove external parser dependencies from the capsule hot path and support package-lock-only dependency resolution.
- Replace temporary Runner source paths in portable receipts with an All2CF-managed immutable source URL.
- Derive portable R2, Vectorize and domain placeholders from the project slug and zero canonical Stream account identity.
- Extend the Factory contract to prove the injected receipt identity.

# Verification

- Factory contract passes normal Git-backed generation plus injected immutable portable-capsule identity and confirms canonical Cloudflare topology is absent. Node-only identity/knowledge parsing and package-lock-only resolution pass complete repository verification. A new All2CF capsule render remains pending.

# Release

No Development or Production release authorized.
