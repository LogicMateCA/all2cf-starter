import { useEffect, useMemo, useState } from "react";
import { Activity, Code2, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Provider = "cloudflare-web-analytics" | "google-analytics" | "google-tag-manager" | "plausible" | "custom-external";
type Integration = {
  id: string;
  name: string;
  provider: Provider;
  status: "draft" | "published" | "disabled";
  environment: "development" | "production";
  surfaces: string[];
  config: Record<string, unknown>;
  csp_sources: Record<string, string[]>;
  version: number;
  published_at: string | null;
  updated_at: string;
};

const providers: Array<{ id: Provider; label: string; description: string; field: string; placeholder: string }> = [
  { id: "cloudflare-web-analytics", label: "Cloudflare Web Analytics", description: "Privacy-first page and performance analytics.", field: "Site token", placeholder: "Cloudflare Web Analytics token" },
  { id: "google-analytics", label: "Google Analytics", description: "Load GA through the first-party Starter loader.", field: "Measurement ID", placeholder: "G-XXXXXXXXXX" },
  { id: "google-tag-manager", label: "Google Tag Manager", description: "Use GTM as the destination manager.", field: "Container ID", placeholder: "GTM-XXXXXXX" },
  { id: "plausible", label: "Plausible", description: "Lightweight external analytics with a tracked domain.", field: "Tracked domain", placeholder: "example.com" },
  { id: "custom-external", label: "Custom script URL", description: "Advanced: load one reviewed HTTPS script. Inline code is intentionally unsupported.", field: "HTTPS script URL", placeholder: "https://example.com/analytics.js" },
];
const surfaceOptions = [
  { id: "marketing", label: "Marketing" },
  { id: "web", label: "Web app" },
  { id: "docs", label: "Docs" },
];

export function AdminAnalytics() {
  const [items, setItems] = useState<Integration[]>([]);
  const [provider, setProvider] = useState<Provider>("cloudflare-web-analytics");
  const [name, setName] = useState("Cloudflare Web Analytics");
  const [value, setValue] = useState("");
  const [environment, setEnvironment] = useState<"development" | "production">("development");
  const [surfaces, setSurfaces] = useState<string[]>(["marketing"]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const selectedProvider = useMemo(() => providers.find((item) => item.id === provider)!, [provider]);

  const load = async () => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/site-integrations", { credentials: "include" });
    const payload = (await response.json()) as { data?: Integration[]; error?: { message?: string } };
    setLoading(false);
    if (!response.ok) return setError(payload.error?.message || "Unable to load site integrations.");
    setItems(payload.data || []);
  };
  useEffect(() => { void load(); }, []);

  const selectProvider = (next: Provider) => {
    const definition = providers.find((item) => item.id === next)!;
    setProvider(next);
    setName(definition.label);
    setValue("");
  };
  const toggleSurface = (surface: string) => setSurfaces((current) => current.includes(surface) ? current.filter((item) => item !== surface) : [...current, surface]);
  const config = () => provider === "plausible" ? { domain: value.trim() } : provider === "custom-external" ? { source: value.trim() } : { identifier: value.trim() };

  const create = async () => {
    if (!name.trim() || !value.trim() || !surfaces.length) return;
    setBusy("create");
    setError("");
    const response = await fetch("/api/admin/site-integrations", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provider, environment, surfaces, config: config(), status: "draft" }),
    });
    const payload = (await response.json()) as { error?: { message?: string } };
    setBusy("");
    if (!response.ok) return setError(payload.error?.message || "Unable to create integration.");
    setValue("");
    await load();
  };
  const setStatus = async (item: Integration, status: Integration["status"]) => {
    setBusy(item.id);
    setError("");
    const response = await fetch(`/api/admin/site-integrations/${encodeURIComponent(item.id)}`, {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const payload = (await response.json()) as { error?: { message?: string } };
    setBusy("");
    if (!response.ok) return setError(payload.error?.message || "Unable to update integration.");
    await load();
  };

  return (
    <div className="admin-analytics-layout">
      <section className="operations-card admin-analytics-intro">
        <div><Activity size={18} /><div><h3>External analytics only</h3><p>Starter publishes configuration and a small cached loader. Visitor events go directly to the selected provider; Starter does not build its own analytics warehouse.</p></div></div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw size={14} /> Refresh</Button>
      </section>
      {error ? <p className="operations-error" role="alert">{error}</p> : null}
      <div className="admin-analytics-grid">
        <section className="operations-card integration-compose">
          <header><span>New destination</span><h3>Add analytics or an external script</h3><p>Start as a draft. Publish only after reviewing surfaces and CSP sources.</p></header>
          <div className="integration-provider-grid">
            {providers.map((item) => <button type="button" key={item.id} className={provider === item.id ? "selected" : ""} onClick={() => selectProvider(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}
          </div>
          <label><span>Name</span><Input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label><span>{selectedProvider.field}</span><Input value={value} placeholder={selectedProvider.placeholder} onChange={(event) => setValue(event.target.value)} /></label>
          <div className="integration-inline-fields">
            <label><span>Environment</span><select value={environment} onChange={(event) => setEnvironment(event.target.value as "development" | "production")}><option value="development">Development</option><option value="production">Production</option></select></label>
            <fieldset><legend>Surfaces</legend>{surfaceOptions.map((surface) => <label key={surface.id}><input type="checkbox" checked={surfaces.includes(surface.id)} onChange={() => toggleSurface(surface.id)} /> {surface.label}</label>)}</fieldset>
          </div>
          <Button type="button" onClick={() => void create()} disabled={busy === "create" || !value.trim() || !surfaces.length}><Plus size={15} /> Create draft</Button>
        </section>
        <section className="operations-card integration-list">
          <header><div><span>Published configuration</span><h3>Destinations</h3></div><strong>{items.length}</strong></header>
          {!loading && !items.length ? <div className="integration-empty"><Code2 size={22} /><p>No analytics code is loaded. Add a destination when the product is ready.</p></div> : null}
          {items.map((item) => (
            <article key={item.id}>
              <div className="integration-row-main"><span className={`integration-state ${item.status}`} /><div><strong>{item.name}</strong><small>{providers.find((provider) => provider.id === item.provider)?.label} · {item.environment} · v{item.version}</small></div><em>{item.status}</em></div>
              <div className="integration-surfaces">{item.surfaces.map((surface) => <span key={surface}>{surface}</span>)}</div>
              <details><summary>CSP and configuration</summary><pre>{JSON.stringify({ config: item.config, csp: item.csp_sources }, null, 2)}</pre></details>
              <div className="integration-actions">
                {item.status !== "published" ? <Button size="sm" onClick={() => void setStatus(item, "published")} disabled={busy === item.id}><Play size={14} /> Publish</Button> : <Button size="sm" variant="outline" onClick={() => void setStatus(item, "disabled")} disabled={busy === item.id}><Pause size={14} /> Disable</Button>}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
