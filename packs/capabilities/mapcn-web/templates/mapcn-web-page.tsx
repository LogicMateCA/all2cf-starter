// Materialized from capability.mapcn-web. Owned by the Starter project after generation.
import { CircleDot } from "lucide-react";
import { AccountControl } from "@/components/account-control";
import { StarterMap } from "@/components/capabilities/mapcn-web-map";
import "@/components/capabilities/mapcn-web.css";

const mapStyle = import.meta.env.VITE_MAP_STYLE_URL || undefined;

export function MapCapabilityPage() {
  return <div className="product-shell map-capability-shell">
    <header className="product-header"><a className="brand" href="/"><span><CircleDot size={17} /></span><strong>Cloudflare AI Starter</strong></a><nav><a href="/app">Workspace</a><a href="/map" aria-current="page">Map</a></nav><AccountControl compact /></header>
    <main className="map-capability-main">
      <header><span>Optional capability</span><h1>Web map foundation</h1><p>MapLibre rendering with an owned, route-lazy MapCN adaptation.</p></header>
      {!mapStyle ? <p className="map-config-note">Blank verification style active. Configure <code>VITE_MAP_STYLE_URL</code> before releasing a real basemap.</p> : null}
      <StarterMap center={[-114.0719, 51.0447]} zoom={9} style={mapStyle} markers={[{ id: "calgary", longitude: -114.0719, latitude: 51.0447, label: "Calgary", description: "Replace this sample marker with project data." }]} />
    </main>
  </div>;
}
