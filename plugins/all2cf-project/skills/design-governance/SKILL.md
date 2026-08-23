---
name: all2cf-design-governance
description: Select, extend or audit visual direction, page recipes and dynamic components in an All2CF-generated project while preserving its project-owned Design Profile.
---

# All2CF design governance

Read `DESIGN.md`, the current Design Profile, `design/providers.json`, and the affected surface. The project-owned Design Profile is authoritative. Provider priority is: explicit project customization, user reference, selected design/taste workflow, selected component or recipe, StyleKit fallback.

StyleKit owns global tokens. ThreeUI and React Bits are optional Web component providers; install only selected entries, isolate client motion, lazy-load heavy effects, provide reduced-motion and mobile fallbacks, and keep heavy motion out of ordinary product/admin surfaces. HTML Anything supplies adapted recipes only; never install its editor or agent runtime into the product.

Inspection and recommendation are read-only. Modify dependencies, source files or the Design Profile only when the user explicitly asks to add, install, apply or replace the selected capability.

Use official upstream installation paths. Do not mirror or resell React Bits, include React Bits Pro without the customer's license, or copy ThreeUI Pro/Beta content. Record installed components, provider/version, placement and performance policy in the project Design Profile and Agent Map.

Route visual exploration and UX audits through the available Product Design/taste capability. Do not let a provider overwrite established custom identity.
