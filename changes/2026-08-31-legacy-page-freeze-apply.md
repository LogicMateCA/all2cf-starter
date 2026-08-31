# Legacy Page freeze during applied updates

## Problem

Starter 2.1.9 correctly omitted selected Page files from a functional update plan, but the apply loop independently unlinked every previously owned file that was absent from the desired functional set. A real isolated 2.1.2 to 2.1.9 update therefore reported success while deleting the marketing application.

Older receipts also cannot always reconstruct current Page selection metadata, so relying only on the target Engine's `pageFiles` map is insufficient.

## Decision

- Functional planning records prior `page.*` ownership and every existing `apps/marketing/` path as frozen legacy product output.
- The apply loop explicitly skips every frozen target before unlinking obsolete functional files.
- Functional conflicts elsewhere remain fail-closed.
- Release acceptance must use an isolated prior-Stable project, its own lockfile and dependency volume, and compare the complete marketing path/content set before and after update.

## Evidence

- `npm run factory:contract` exercises an actual functional Pack change, a customer marker in the marketing home Page, and all previously owned marketing paths.
- The contract fails if any marketing path is deleted or overwritten.
- Case-collision, symbolic-link, customer-only Pack change and Agent Map preservation probes remain active.
