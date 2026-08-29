---
id: versioned-changelog
title: Require a complete versioned public update timeline
status: development-verified
affectedModules: [assembler, docs]
docsImpact: [CHANGELOG.md, RELEASE.md, README.md]
---

# Outcome

`CHANGELOG.md` becomes the public version timeline. Stable `2.1.1` records Added, Changed, Fixed, Performance, Security and Migration sections, while earlier development milestones are summarized by version/date and remain traceable to detailed Change Specs.

Engine candidate verification now fails when the requested version lacks exactly one dated Changelog heading, required release-note sections or a matching GitHub Release link. Future updates must add their Changelog entry before candidate construction; GitHub Release notes use the same version narrative.

# Verification

- `npm run changelog:contract -- --version=2.1.1`
- Source release invokes the same contract before full verification.
- README links the public timeline.

# Release

Publish `CHANGELOG.md` in GitHub main, packaged source archives, Docs references and Release `v2.1.1`. Future SemVer increments must extend Unreleased and add a dated version section when promoted.
