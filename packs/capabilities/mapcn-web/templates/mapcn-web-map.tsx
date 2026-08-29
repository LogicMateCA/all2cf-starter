// Materialized from capability.mapcn-web. Owned by the Starter project after generation.
import { useEffect, useId, useRef, useState } from "react";
import type { Map as MapLibreMap, MapOptions, Marker as MapLibreMarker, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type StarterMapMarker = {
  id: string;
  longitude: number;
  latitude: number;
  label: string;
  description?: string;
};

export type StarterMapProps = {
  center: [number, number];
  zoom: number;
  markers?: StarterMapMarker[];
  style?: string | StyleSpecification;
  className?: string;
  onReady?: (map: MapLibreMap) => void;
};

const blankStyle = (dark: boolean): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": dark ? "#111827" : "#e8edf3" } }],
});

function resolvedDarkMode() {
  const root = document.documentElement;
  if (root.classList.contains("dark") || root.dataset.theme === "dark") return true;
  if (root.classList.contains("light") || root.dataset.theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function StarterMap({ center, zoom, markers = [], style, className = "", onReady }: StarterMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const descriptionId = useId();
  const [state, setState] = useState<"loading" | "ready" | "unsupported" | "error">("loading");

  useEffect(() => {
    if (!container.current) return;
    if (!window.WebGLRenderingContext) {
      setState("unsupported");
      return;
    }
    let disposed = false;
    let themeObserver: MutationObserver | null = null;
    let systemTheme: MediaQueryList | null = null;
    let syncTheme: (() => void) | null = null;

    void import("maplibre-gl").then((maplibre) => {
      if (disposed || !container.current) return;
      const options: MapOptions = {
        container: container.current,
        center,
        zoom,
        style: style || blankStyle(resolvedDarkMode()),
        attributionControl: { compact: false },
        renderWorldCopies: false,
        cooperativeGestures: true,
      };
      const map = new maplibre.Map(options);
      mapRef.current = map;
      map.addControl(new maplibre.NavigationControl({ showCompass: true, visualizePitch: true }), "top-right");
      map.once("load", () => {
        if (disposed) return;
        setState("ready");
        onReady?.(map);
      });
      map.on("error", () => { if (!disposed) setState("error"); });

      markersRef.current = markers.map((marker) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "starter-map-marker";
        button.setAttribute("aria-label", marker.label);
        const point = new maplibre.Marker({ element: button })
          .setLngLat([marker.longitude, marker.latitude]);
        if (marker.description) {
          const popup = document.createElement("div");
          const title = document.createElement("strong");
          const description = document.createElement("p");
          title.textContent = marker.label;
          description.textContent = marker.description;
          popup.append(title, description);
          point.setPopup(new maplibre.Popup({ offset: 18, closeButton: true }).setDOMContent(popup));
        }
        return point.addTo(map);
      });

      if (!style) {
        syncTheme = () => map.setStyle(blankStyle(resolvedDarkMode()), { diff: true });
        themeObserver = new MutationObserver(syncTheme);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
        systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
        systemTheme.addEventListener("change", syncTheme);
      }
    }).catch(() => { if (!disposed) setState("error"); });

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      if (systemTheme && syncTheme) systemTheme.removeEventListener("change", syncTheme);
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div className={`starter-map ${className}`} data-state={state}>
    <div ref={container} className="starter-map-canvas" role="application" aria-describedby={descriptionId} />
    <p id={descriptionId} className="sr-only">Interactive map. Use arrow keys to pan and plus or minus to zoom.</p>
    {state === "loading" ? <div className="starter-map-state" role="status">Loading map</div> : null}
    {state === "unsupported" ? <div className="starter-map-state" role="status">This browser cannot display the interactive map.</div> : null}
    {state === "error" ? <div className="starter-map-state" role="alert">The map could not be loaded. Try again later.</div> : null}
  </div>;
}
