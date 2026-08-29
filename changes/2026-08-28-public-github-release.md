---
id: public-github-release
title: Build a neutral verified GitHub source release
status: development-verified
affectedModules: [assembler, docs]
docsImpact: [README.md, apps/docs/src/content/docs/docs]
---

# Outcome

The public GitHub repository is built from one hash-verified Engine candidate rather than from the canonical working directory. The public builder neutralizes product identity, domains, Cloudflare IDs and infrastructure hosts; deselects every optional Pack; materializes the zero-optional-Pack baseline; retains `/setup`, Pack templates, Catalogs, AI contracts and release workflows; writes a public source receipt; and fails on known private-environment markers.

README and Starlight Docs now treat clone/download plus local `/setup` as the primary workflow. Canonical `/factory` remains a maintainer/source concern rather than an end-user prerequisite.

# Verification

- `npm run public:release -- --version=<verified Engine> --target=<empty directory>`
- public receipt reports `optionalPackCount: 0`
- public leak scan reports zero matches
- public checkout runs `npm ci`, type checks, Docs build, product build and minimal bundle checks

# Release

Publish only the verified neutral output to `LogicMateCA/all2cf-starter`. Create a matching GitHub Release with the Engine Artifact SHA. Do not push canonical local identities, ignored evidence, credentials, Runner configuration or All2CF private control-plane code.
