import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, RefreshCw, RotateCw, Send, Trash2 } from "lucide-react";
import { ProductShell } from "@/components/product-shell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import "./outgoing-webhooks-page.css";

type Endpoint = {
  id: string;
  url: string;
  description: string;
  event_types: string[];
  enabled: boolean;
  secret_version: number;
  created_at: string;
};

type Delivery = {
  id: string;
  status: string;
  attempt_count: number;
  response_status: number | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
  event_type: string;
  url: string;
  owner_user_id?: string;
};

async function readPayload<T>(response: Response) {
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string };
  };
  if (!response.ok) throw new Error(payload.error?.message || "Request failed.");
  return payload.data as T;
}

export function OutgoingWebhooksPage() {
  const { data: session, isPending } = authClient.useSession();
  const adminView = window.location.pathname.startsWith("/admin/");
  const role = String(
    session?.user && "role" in session.user ? session.user.role || "" : "",
  );
  const isAdmin = role.split(",").map((value) => value.trim()).includes("admin");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [eventTypes, setEventTypes] = useState("starter.webhook.test");
  const [revealedSecret, setRevealedSecret] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      if (adminView) {
        const response = await fetch("/api/admin/webhooks", { credentials: "include" });
        setDeliveries(await readPayload<Delivery[]>(response));
        setEndpoints([]);
      } else {
        const response = await fetch("/api/webhooks", { credentials: "include" });
        const data = await readPayload<{ endpoints: Endpoint[]; deliveries: Delivery[] }>(response);
        setEndpoints(data.endpoints);
        setDeliveries(data.deliveries);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [adminView]);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      const returnTo = adminView ? "/admin/webhooks" : "/app/webhooks";
      window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (adminView && !isAdmin) return;
    void load();
  }, [adminView, isAdmin, isPending, load, session?.user?.id]);

  const createEndpoint = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          description,
          eventTypes: eventTypes.split(",").map((value) => value.trim()).filter(Boolean),
        }),
      });
      const result = await readPayload<{ endpoint: Endpoint; secret: string }>(response);
      setRevealedSecret(result.secret);
      setUrl("");
      setDescription("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const rotate = async (endpointId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/webhooks/endpoints/${encodeURIComponent(endpointId)}/rotate`, {
        method: "POST",
        credentials: "include",
      });
      const result = await readPayload<{ secret: string }>(response);
      setRevealedSecret(result.secret);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (endpoint: Endpoint) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/webhooks/endpoints/${encodeURIComponent(endpoint.id)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: endpoint.description,
          eventTypes: endpoint.event_types,
          enabled: !endpoint.enabled,
        }),
      });
      await readPayload(response);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const archive = async (endpointId: string) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/webhooks/endpoints/${encodeURIComponent(endpointId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) await readPayload(response);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/webhooks/test", {
        method: "POST",
        credentials: "include",
      });
      await readPayload(response);
      window.setTimeout(() => void load(), 900);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  if (isPending || !session?.user)
    return <main className="protected-loading" aria-label="Loading webhooks" />;
  if (adminView && !isAdmin)
    return (
      <main className="webhook-denied">
        <h1>Admin access required</h1>
        <a href="/app">Return to workspace</a>
      </main>
    );

  return (
    <ProductShell activePath={adminView ? "/admin" : "/app/webhooks"}>
      <main className="webhook-shell">
        <header className="webhook-heading">
          <div>
            <span>{adminView ? "Platform operations" : "Developer delivery"}</span>
            <h1>{adminView ? "Webhook evidence" : "Outgoing webhooks"}</h1>
            <p>
              {adminView
                ? "Read-only delivery state across the platform. Secrets and payloads are intentionally absent."
                : "Send signed product events through a durable Cloudflare Queue and inspect every attempt."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={busy}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </header>

        {error ? <p className="webhook-error" role="alert">{error}</p> : null}

        {!adminView ? (
          <>
            <section className="webhook-card webhook-create">
              <div>
                <span>New endpoint</span>
                <h2>Connect a receiver</h2>
              </div>
              <label>
                <span>HTTPS URL</span>
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/webhooks/product" />
              </label>
              <label>
                <span>Description</span>
                <input value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} placeholder="Production automation" />
              </label>
              <label>
                <span>Events · comma separated</span>
                <input value={eventTypes} onChange={(event) => setEventTypes(event.target.value)} />
              </label>
              <Button onClick={() => void createEndpoint()} disabled={busy || !url.trim()}>
                <Plus size={15} /> Create endpoint
              </Button>
            </section>

            {revealedSecret ? (
              <section className="webhook-secret" role="status">
                <div>
                  <strong>Copy this signing secret now</strong>
                  <span>It will not be shown again.</span>
                </div>
                <code>{revealedSecret}</code>
                <Button variant="outline" onClick={() => void navigator.clipboard.writeText(revealedSecret)}>
                  <Copy size={15} /> Copy
                </Button>
              </section>
            ) : null}

            <section className="webhook-section">
              <div className="webhook-section-title">
                <div><span>Destinations</span><h2>Endpoints</h2></div>
                <Button variant="outline" onClick={() => void sendTest()} disabled={busy || !endpoints.some((item) => item.enabled)}>
                  <Send size={15} /> Send test
                </Button>
              </div>
              <div className="webhook-endpoints">
                {endpoints.map((endpoint) => (
                  <article className="webhook-card" key={endpoint.id}>
                    <div className="webhook-endpoint-top">
                      <div>
                        <strong>{endpoint.description || "Unnamed endpoint"}</strong>
                        <code>{endpoint.url}</code>
                      </div>
                      <span className={`webhook-status ${endpoint.enabled ? "succeeded" : "failed"}`}>{endpoint.enabled ? "enabled" : "paused"}</span>
                    </div>
                    <div className="webhook-events">{endpoint.event_types.map((event) => <span key={event}>{event}</span>)}</div>
                    <footer>
                      <small>Secret version {endpoint.secret_version}</small>
                      <div>
                        <Button variant="outline" onClick={() => void toggle(endpoint)} disabled={busy}>{endpoint.enabled ? "Pause" : "Resume"}</Button>
                        <Button variant="outline" onClick={() => void rotate(endpoint.id)} disabled={busy}><RotateCw size={14} /> Rotate</Button>
                        <Button variant="outline" onClick={() => void archive(endpoint.id)} disabled={busy}><Trash2 size={14} /> Archive</Button>
                      </div>
                    </footer>
                  </article>
                ))}
                {!endpoints.length ? <p className="webhook-empty">No endpoints yet.</p> : null}
              </div>
            </section>
          </>
        ) : null}

        <section className="webhook-section">
          <div className="webhook-section-title"><div><span>Queue evidence</span><h2>Recent deliveries</h2></div><small>{deliveries.length} shown</small></div>
          <div className="webhook-deliveries">
            {deliveries.map((delivery) => (
              <article className="webhook-card webhook-delivery" key={delivery.id}>
                <div>
                  <span className={`webhook-status ${delivery.status}`}>{delivery.status}</span>
                  <strong>{delivery.event_type}</strong>
                  {adminView && delivery.owner_user_id ? <small>{delivery.owner_user_id}</small> : null}
                </div>
                <code>{delivery.url}</code>
                <div className="webhook-delivery-meta">
                  <span>{delivery.attempt_count} attempt{delivery.attempt_count === 1 ? "" : "s"}</span>
                  <span>{delivery.response_status || "no response"}</span>
                  <span>{new Date(delivery.created_at).toLocaleString()}</span>
                </div>
                {delivery.last_error ? <small className="webhook-last-error">{delivery.last_error}</small> : null}
              </article>
            ))}
            {!deliveries.length ? <p className="webhook-empty">No deliveries yet.</p> : null}
          </div>
        </section>
      </main>
    </ProductShell>
  );
}
