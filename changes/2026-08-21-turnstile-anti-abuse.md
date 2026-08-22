---
id: turnstile-anti-abuse
title: Add optional Better Auth Turnstile protection
status: local-verified
affectedModules: [assembler, auth, operations, docs]
docsImpact: [PROJECT.md, ARCHITECTURE.md, features/assembler/MODULE.md, features/auth/MODULE.md, features/operations/MODULE.md, features/docs/MODULE.md, starter.manifest.json, catalog/providers.json, /setup, /dp]
---

# Outcome

A copied project can select Cloudflare Turnstile and protect credential registration, password sign-in and password-reset requests without replacing Better Auth or carrying Turnstile configuration when the capability is unselected.

# Scope

- Add a receipt-owned `capability.turnstile` Pack that installs Better Auth's official Captcha plugin for Cloudflare Turnstile.
- Add separate Development and Production public site keys plus write-only environment secret keys; generated Wrangler variables and secret requirements exist only while selected.
- Return only the public site key to the login UI, load the Turnstile script only on protected credential steps and send its token through Better Auth's `x-captcha-response` contract.
- Add local Setup Provider selection, official configuration links, credential storage, an interactive widget and a real Siteverify validation button.
- Keep Turnstile optional by default and preserve Better Auth database rate limiting when it is not selected.

# Verification

- Cloudflare's live Siteverify endpoint accepted the official passing test secret/token and rejected the official failing test secret/token.
- Selected-pack Workerd smoke proved a missing-token credential request is denied and valid test tokens complete registration, sign-in and password-reset flows against a disposable empty PostgreSQL database.
- Generated Development/Production types contain only their selected environment site key and the secret requirement; all workspace types pass.
- The deselect plan removed the plugin file, generated variables and secret requirement, then the complete no-Turnstile auth regression passed.
- The local Setup browser matrix passed four responsive light/dark cases, eight screenshots and zero failures; the real widget/Siteverify action remains token-driven rather than inferred from that visual matrix.
- Official Cloudflare MCP and Worker Studio MCP were not callable in this session; current Cloudflare Turnstile testing and Siteverify requirements were checked in official Cloudflare docs, and the plugin contract was checked in current Better Auth 1.7 docs.

# Release

Local verification only. The current Blueprint leaves Turnstile unselected and contains no test keys. No Development or Production Worker was deployed.
