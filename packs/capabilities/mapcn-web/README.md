# MapCN Web capability pack

This optional pack adapts MapCN's shadcn-style composition model into a small Starter-owned MapLibre component. MapCN is a pinned MIT-licensed donor, not a runtime service or automatic source dependency.

The adapted baseline intentionally keeps only the common product needs: lazy MapLibre loading, an explicit style contract, accessible markers, built-in navigation controls, loading/error/unsupported states, theme-aware blank fallback, and complete cleanup. Routes, exact Worker-first configuration, the Worker asset-shell registry, MapLibre's worker modules, and the `maplibre-gl` dependency enter the built application only while `capability.mapcn-web` is selected and materialized.

The blank fallback is for local verification and data overlays. A real product must provide `VITE_MAP_STYLE_URL` and verify the selected map data/tile provider's license, attribution, privacy, availability, and cost before release. This pack does not use MapCN's default CARTO basemap because its commercial terms are not a safe generic Starter default.
