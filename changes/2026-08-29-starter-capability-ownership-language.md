---
id: starter-capability-ownership-language
title: Present product capabilities as Starter modules and keep public versions synchronized
status: development-verified
affectedModules: [auth, assembler, billing, organizations, api-keys, account-security]
docsImpact: [README.md, CAPABILITIES.md, VERSIONING.md, apps/docs/src/content/docs/docs]
---

# Outcome

Public product language presents authentication and sessions as powered by Better Auth, while 2FA, Teams and Organizations, API Keys, Billing and other behavior are All2CF Starter Modules. Technical Pack documentation continues to identify the specific upstream adapter and dependency for licensing, schema and upgrade responsibility.

All public surfaces remain synchronized to one stable version: website, Docs, GitHub tag/Release, packaged source and public All2CF download. The previously considered leading website Preview channel is deferred until automated multi-channel release support exists.

# Verification

- Setup core card reads Authentication rather than Better Auth.
- Public README and capability reference distinguish product module ownership from authentication implementation.
- Technical optional-Pack guide retains upstream adapter attribution.
- Version policy rejects an advertised public preview ahead of the stable package.

# Release

Include these descriptions and synchronized-version policy in stable `2.1.1` before GitHub packaging and website publication.
