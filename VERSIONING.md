# Versioning policy

The public version line starts at `2.1.1` and follows Semantic Versioning.

| Change | Next version example |
|---|---|
| Backward-compatible fix, security correction or docs correction | `2.1.2` |
| New backward-compatible Pack, Provider, page or Setup capability | `2.2.0` |
| Breaking Blueprint, Pack, update, database initialization or runtime contract | `3.0.0` |

Engine candidates may use `-dev.N` while under validation. Stable GitHub source packages, tags and promoted download channels omit prerelease suffixes. One release identity includes the canonical source commit, Engine version, Artifact SHA-256, public source receipt and Git tag.

Changing a version never authorizes Production deployment. Development and Production release authorization remain separate project operations.
