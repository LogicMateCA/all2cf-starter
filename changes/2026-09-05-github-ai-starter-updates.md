---
id: github-ai-starter-updates
title: Replace the retired All2CF update channel with GitHub AI comparison
status: implemented
affectedModules: [maintenance, assembler, setup]
docsImpact: [skills/starter-maintenance/SKILL.md, 碰见问题记录.md]
---

# Outcome

Generated projects resolve the latest stable Starter from GitHub Releases without All2CF authorization. The local updater verifies the release asset digest, compares Base/Local/Target, preserves product-only changes, blocks simultaneous changes, creates a recovery snapshot and verifies the project after application.

# Compatibility

Old receipts containing All2CF fields migrate to `updateMode: github-release` after a successful update. Explicit local/HTTPS Channels remain available only through `STARTER_UPDATE_CHANNEL_URL` for tests.

# Verification

- Live GitHub Latest Release resolution for 2.3.4
- Exact target commit and GitHub asset SHA-256
- Safe archive extraction and complete Catalog version projection
- TypeScript and all site builds
- Generated-project regression: status, diff, add, update, lock refusal, rollback snapshot, customer file/dependency preservation and simultaneous-conflict blocking without an All2CF token

# Release

Released as Starter 2.3.5 after source qualification, Engine verification and public archive validation.
