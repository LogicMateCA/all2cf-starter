---
module: media
status: local-verified
source: starter
---

# Media module

Purpose: keep original files, image optimization and video streaming as separate capabilities with independent cost and lifecycle boundaries.

- Object Storage remains authoritative for ordinary/original bytes. Selecting Cloudflare Images adds transformation behavior only.
- The Images helper consumes a server-authorized byte stream, caps width/height at 4096, restricts output to WebP/AVIF/JPEG/PNG and uses a configurable input ceiling up to Cloudflare's 20 MiB platform limit.
- No public arbitrary URL proxy or client-owned source is generated. Copied products own source authorization and cache keys; repeated transformations require an explicit Cache policy.
- `/api/admin/images/test` transforms one fixed decoded RGB fixture and returns no-store output. Admin health only reports Binding/policy readiness.
- Cloudflare Stream remains a separate Planned Provider until direct upload, ownership, webhook state and playback authorization are executable.

The low-fidelity local Images Binding passed PNG-to-WebP transformation, selected types/dry-runs and complete removal. High-fidelity Development behavior, cache headers and product-specific source authorization remain release gates.
