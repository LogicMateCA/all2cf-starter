import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type HealthStatus = "ok" | "attention" | "unknown" | "not-selected";
type HealthComponent = {
  id: string;
  label: string;
  status: HealthStatus;
  summary: string;
  details: Record<string, boolean | number | string | null>;
};
type HealthSnapshot = {
  status: "ok" | "attention";
  environment: string;
  service: string;
  checkedAt: string;
  components: HealthComponent[];
};

function detailLabel(value: string) {
  return value.replace(/([a-z])([A-Z])/gu, "$1 $2");
}

export function AdminHealth() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/health", {
        credentials: "include",
      });
      const payload = (await response.json()) as {
        data?: HealthSnapshot;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data)
        throw new Error(payload.error?.message || "Unable to read system health.");
      setSnapshot(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading && !snapshot)
    return <section className="operations-card admin-health-loading">Reading operational evidence…</section>;
  if (error && !snapshot)
    return <section className="operations-card admin-health-loading" role="alert">{error}</section>;
  if (!snapshot) return null;

  return (
    <section className="admin-health" aria-labelledby="admin-health-heading">
      <header className="operations-card admin-health-summary">
        <div>
          <span>Current environment</span>
          <h3 id="admin-health-heading">{snapshot.service} · {snapshot.environment}</h3>
          <p>Checked {new Date(snapshot.checkedAt).toLocaleString()}. Optional providers are healthy when unselected, not falsely marked broken.</p>
        </div>
        <div>
          <span className={`status ${snapshot.status}`}>{snapshot.status}</span>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> {loading ? "Checking" : "Refresh"}
          </Button>
        </div>
      </header>
      {error ? <p className="operations-error" role="alert">{error}</p> : null}
      <div className="admin-health-grid">
        {snapshot.components.map((component) => (
          <article className="operations-card admin-health-component" key={component.id}>
            <header>
              <h3>{component.label}</h3>
              <span className={`status ${component.status}`}>{component.status}</span>
            </header>
            <p>{component.summary}</p>
            <dl>
              {Object.entries(component.details).map(([label, value]) => (
                <div key={label}>
                  <dt>{detailLabel(label)}</dt>
                  <dd>{value === null ? "—" : String(value)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}
