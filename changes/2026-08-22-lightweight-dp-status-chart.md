---
id: lightweight-dp-status-chart
title: Replace the oversized internal status chart runtime
status: implemented
affectedModules: [docs]
docsImpact: [PERFORMANCE.md, features/docs/MODULE.md, /dp]
---

# Outcome

The internal Development Plan keeps an accessible technology-status visualization without downloading a 103KB-gzip Recharts chunk for a small count summary.

# Scope

- Replace the DP-only BarChart with semantic list/count markup and CSS progress bars.
- Keep the chart route-deferred and reserve its existing loading geometry.
- Retain the generic shadcn chart adapter and Recharts dependency for future explicitly selected product charts; this change removes them only from the DP runtime graph.
- Constrain relationship-grid children and long Binding names so the mobile DP keeps table overflow local instead of widening the document.

# Verification

- Web types/build pass. The chart chunk fell from 103,831 bytes gzip to 475 bytes gzip (99.5% smaller), and transformed modules fell from 2,610 to 2,037.
- Public browser acceptance passed all 48 desktop/mobile light/dark cases with 50 screenshots, zero overflow/accessibility/console/subresource failures and artifact SHA `d9844ae50763157c799d9b538fb9f847bf620a38dd85ec1bfc06bc56743e873a`.

# Release

No release yet. Development and Production remain unchanged.
