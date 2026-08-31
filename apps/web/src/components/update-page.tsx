import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Download,
  ExternalLink,
  FileText,
  Link2,
  RefreshCw,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { Button } from "./ui/button";
import "../maintenance.css";

type Receipt = Record<string, unknown> & {
  engineVersion?: string;
  sourceCommit?: string;
  artifactSha256?: string;
  channelUrl?: string;
  updateServiceUrl?: string;
};
type AvailableUpdate = {
  engineVersion?: string;
  components?: Array<{
    id: string;
    installed?: string;
    available?: string;
    updateAvailable?: boolean;
    materialized?: boolean;
  }>;
  runtime?: Array<{ name: string; packageName: string; installed: string }>;
  releaseNotes?: string[];
  releaseUrl?: string | null;
  publishedAt?: string | null;
  channel?: string;
};
type ActionResult = {
  ok: boolean;
  output?: string;
  error?: string;
  entitlement?: { authorized?: boolean; plan?: string; features?: string[] };
  receipt?: Receipt;
  available?: AvailableUpdate;
};
type DiffItem = {
  kind?: string;
  target?: string;
  packId?: string;
  reason?: string;
};
type DiffPlan = {
  summary: { safe: number; preserved: number; conflicts: number };
  changes: DiffItem[];
  preserved: DiffItem[];
  failures?: string[];
};
type ConnectionState = {
  ok: boolean;
  connected: boolean;
  mode: "independent" | "all2cf-connected";
  workspace?: "generated-project" | "canonical-source";
  expiresAt?: string | null;
  projectId?: string | null;
  installationId?: string | null;
  project?: { name?: string; slug?: string };
};

async function jsonRequest<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}
async function callUpdate(path: string, token: string) {
  return jsonRequest<ActionResult>(`/__starter/update/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: token }),
  });
}

function changeLabel(item: DiffItem) {
  const kind = String(item.kind || "change").replaceAll("-", " ");
  return `${kind}: ${item.target || item.packId || "managed Starter state"}`;
}

export function UpdatePage() {
  const [legacyToken, setLegacyToken] = useState(
    () => sessionStorage.getItem("starter.all2cf.updateToken") || "",
  );
  const [connectionText, setConnectionText] = useState("");
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [localReceipt, setLocalReceipt] = useState<Receipt | null>(null);
  const [available, setAvailable] = useState<AvailableUpdate | null>(null);
  const [entitlement, setEntitlement] = useState<ActionResult["entitlement"]>();
  const [diff, setDiff] = useState("");
  const [diffPlan, setDiffPlan] = useState<DiffPlan | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = Boolean(connection?.connected);
  const authorized = Boolean(entitlement?.authorized);
  const credentialAvailable = connected || Boolean(legacyToken.trim());
  const localVersion =
    localReceipt?.engineVersion ||
    (connection?.workspace === "canonical-source"
      ? "Source workspace"
      : "Unknown");
  const cloudVersion =
    available?.engineVersion ||
    (connected ? "Check required" : "Connect to view");
  const updateAvailable = Boolean(
    available?.engineVersion &&
      available.engineVersion !== localReceipt?.engineVersion,
  );
  const expiry = useMemo(
    () =>
      connection?.expiresAt
        ? new Date(connection.expiresAt).toLocaleString()
        : "Until revoked",
    [connection?.expiresAt],
  );

  async function refreshConnection() {
    setConnection(
      await jsonRequest<ConnectionState>("/__starter/all2cf/status"),
    );
  }
  useEffect(() => {
    void refreshConnection().catch((error) =>
      setMessage(error instanceof Error ? error.message : String(error)),
    );
    void jsonRequest<ActionResult>("/__starter/update/receipt")
      .then((payload) => setLocalReceipt(payload.receipt || null))
      .catch(() => setLocalReceipt(null));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("all2cf_code");
    const state = params.get("state");
    if (!code || !state) return;
    setBusy(true);
    void jsonRequest<{ ok: boolean }>("/__starter/all2cf/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
    })
      .then(async () => {
        window.history.replaceState({}, "", "/maintenance");
        await refreshConnection();
        setMessage("All2CF connected automatically.");
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : String(error)),
      )
      .finally(() => setBusy(false));
  }, []);

  async function connectMcp() {
    setBusy(true);
    setMessage("");
    try {
      const payload = await jsonRequest<{ authorizationUrl: string }>(
        "/__starter/all2cf/authorize",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            returnTo: `${window.location.origin}/maintenance`,
          }),
        },
      );
      window.location.assign(payload.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  }
  async function importReceipt(value: unknown) {
    setBusy(true);
    setMessage("");
    try {
      await jsonRequest<{ ok: boolean }>("/__starter/all2cf/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection: value }),
      });
      setConnectionText("");
      await refreshConnection();
      setMessage(
        "All2CF connected. The project remains independently runnable.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (file) await importReceipt(JSON.parse(await file.text()));
  }
  async function importPastedReceipt() {
    try {
      await importReceipt(JSON.parse(connectionText));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid connection receipt.");
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      const result = await jsonRequest<{
        ok: boolean;
        remoteWarning?: string | null;
      }>("/__starter/all2cf/disconnect", { method: "POST" });
      sessionStorage.removeItem("starter.all2cf.updateToken");
      setLegacyToken("");
      setEntitlement(undefined);
      setAvailable(null);
      await refreshConnection();
      setMessage(
        result.remoteWarning ||
          "All2CF disconnected. Project files and deployment ownership are unchanged.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function checkUpdates() {
    setBusy(true);
    setMessage("");
    try {
      const result = await callUpdate("check", legacyToken);
      setEntitlement(result.entitlement);
      setAvailable(result.available || null);
      if (result.receipt) setLocalReceipt(result.receipt);
      setMessage(
        result.entitlement?.authorized
          ? "Cloud version and entitlement refreshed."
          : "This account has no authorized update entitlement.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function previewDiff() {
    setBusy(true);
    try {
      const result = await callUpdate("diff", legacyToken);
      setDiff(result.output || "No managed-file changes reported.");
      try {
        const parsed = JSON.parse(result.output || "{}") as DiffPlan;
        setDiffPlan(parsed.summary ? parsed : null);
      } catch {
        setDiffPlan(null);
      }
      setMessage("Update diff is ready for review.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  async function applyUpdate() {
    setBusy(true);
    try {
      const result = await callUpdate("update", legacyToken);
      setDiff(result.output || "");
      if (result.receipt) setLocalReceipt(result.receipt);
      setMessage(
        "Update applied. Review Git diff and run project verification.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="update-shell maintenance-shell">
      <header className="update-header">
        <div>
          <p className="eyebrow">PROJECT MAINTENANCE</p>
          <h1>Starter updates</h1>
          <p>
            Compare the installed project with the latest authorized All2CF
            release, read what changed, preview file conflicts, and update
            locally.
          </p>
        </div>
        <a className="button button-outline" href="/setup">
          Back to Setup
        </a>
      </header>

      <section className="maintenance-status">
        <div className={connected ? "connected" : "independent"}>
          {connected ? <CheckCircle2 /> : <ShieldCheck />}
          <span>
            <small>All2CF MCP</small>
            <strong>{connected ? "Connected" : "Not connected"}</strong>
          </span>
        </div>
        <div>
          <Link2 />
          <span>
            <small>Project authorization</small>
            <strong>{connected ? expiry : "None"}</strong>
          </span>
        </div>
        <div>
          <Cloud />
          <span>
            <small>Paid plan</small>
            <strong>
              {entitlement?.plan ||
                (connected ? "Check required" : "Unavailable")}
            </strong>
          </span>
        </div>
        <div>
          <ShieldCheck />
          <span>
            <small>Runtime dependency</small>
            <strong>None</strong>
          </span>
        </div>
      </section>

      {!connected ? (
        <section className="update-card maintenance-connect">
          <div>
            <Link2 />
            <span>
              <h2>Connect All2CF MCP</h2>
              <p>
                Sign in once. All2CF automatically verifies project ownership
                and paid entitlement, creates the cloud card, stores the project
                Token locally, and returns here.
              </p>
            </span>
          </div>
          <Button onClick={() => void connectMcp()} disabled={busy}>
            <Link2 size={16} />
            Connect All2CF MCP
          </Button>
          <details>
            <summary>Advanced recovery</summary>
            <p>
              Only use a cloud-issued connection receipt when automatic OAuth is
              unavailable.
            </p>
            <label className="update-field">
              <span>Connection file</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => void importFile(event.target.files?.[0])}
              />
            </label>
            <label className="update-field">
              <span>Or paste connection JSON</span>
              <textarea
                rows={6}
                value={connectionText}
                onChange={(event) => setConnectionText(event.target.value)}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => void importPastedReceipt()}
              disabled={!connectionText.trim()}
            >
              Import receipt
            </Button>
          </details>
        </section>
      ) : null}

      <section className="maintenance-toolbar" aria-label="Starter update actions">
        <Button
          variant="outline"
          onClick={() => void checkUpdates()}
          disabled={busy || !credentialAvailable}
        >
          <RefreshCw size={15} />
          Check updates
        </Button>
        <Button
          variant="outline"
          onClick={() => void previewDiff()}
          disabled={busy || !authorized || !updateAvailable}
        >
          View diff
        </Button>
        <Button
          onClick={() => void applyUpdate()}
          disabled={busy || !authorized || !updateAvailable || !diffPlan || Boolean(diffPlan.summary.conflicts)}
        >
          <Download size={15} />
          {available?.engineVersion ? `Update to ${available.engineVersion}` : "Update"}
        </Button>
        <a className="button button-outline" href="https://app.all2cf.com/deploy/projects" target="_blank" rel="noreferrer">
          Open All2CF project <ExternalLink size={15} />
        </a>
        {available?.releaseUrl ? <a className="button button-outline" href={available.releaseUrl} target="_blank" rel="noreferrer">Release details <ExternalLink size={15} /></a> : null}
        {connected ? (
          <Button variant="outline" onClick={() => void disconnect()} disabled={busy}>
            <Unplug size={15} />
            Disconnect
          </Button>
        ) : null}
      </section>

      <section className="maintenance-version-grid">
        <article>
          <small>Local version</small>
          <strong>{localVersion}</strong>
          <span>
            {localReceipt?.sourceCommit
              ? `Source ${localReceipt.sourceCommit.slice(0, 12)}`
              : "No generated-project receipt"}
          </span>
        </article>
        <article>
          <small>Cloud version</small>
          <strong>{cloudVersion}</strong>
          <span>{available?.channel || "Authorized channel"}</span>
        </article>
        <article>
          <small>Update status</small>
          <strong>
            {!connected
              ? "Connection required"
              : updateAvailable
                ? "Update available"
                : available
                  ? "Up to date"
                  : "Not checked"}
          </strong>
          <span>{available?.publishedAt || ""}</span>
        </article>
      </section>

      {available?.components?.length ? (
        <section className="update-card maintenance-components">
          <div className="maintenance-section-heading">
            <div>
              <h2>Component versions</h2>
              <p>Only installed components are updated. Catalog-only components remain unloaded.</p>
            </div>
            <span>{available.components.filter((component) => component.installed).length} installed</span>
          </div>
          <div className="maintenance-component-list">
            <div className="maintenance-component-row heading"><span>Component</span><span>Local</span><span>Cloud</span><span>Status</span></div>
            {available.components.filter((component) => component.installed).map((component) => (
              <div className="maintenance-component-row" key={component.id}>
                <strong>{component.id}</strong>
                <span>{component.installed}</span>
                <span>{component.available || "—"}</span>
                <span className={component.updateAvailable ? "needs-update" : "current"}>{component.updateAvailable ? "Update available" : "Current"}</span>
              </div>
            ))}
          </div>
          {available.components.some((component) => !component.installed) ? (
            <details className="maintenance-catalog-components">
              <summary>{available.components.filter((component) => !component.installed).length} optional components available in the Catalog</summary>
              <ul>{available.components.filter((component) => !component.installed).map((component) => <li key={component.id}><span>{component.id}</span><strong>{component.available || "—"}</strong></li>)}</ul>
            </details>
          ) : null}
        </section>
      ) : null}

      {available?.runtime?.length ? (
        <section className="update-card maintenance-runtime">
          <div className="maintenance-section-heading">
            <div><h2>Runtime stack</h2><p>Versions are read from this project's package lock, not from a marketing catalog.</p></div>
            <span>{available.runtime.length} installed</span>
          </div>
          <div className="maintenance-runtime-grid">
            {available.runtime.map((item) => <article key={item.packageName}><span>{item.name}</span><strong>{item.installed}</strong><small>{item.packageName}</small></article>)}
          </div>
        </section>
      ) : null}

      <section className="update-card update-plan">
        <div>
          <h2>
            {updateAvailable && available?.engineVersion
              ? `Starter ${localVersion} → ${available.engineVersion}`
              : "Preview and update"}
          </h2>
          <p>
            All2CF authorizes the Engine. The local updater owns conflict
            checks, diff and file application. Project source is not uploaded.
          </p>
        </div>
      {diffPlan ? <><div className="maintenance-diff-summary"><span><small>Safe changes</small><strong>{diffPlan.summary.safe}</strong></span><span><small>Customer changes kept</small><strong>{diffPlan.summary.preserved}</strong></span><span className={diffPlan.summary.conflicts ? "conflict" : "clear"}><small>Conflicts</small><strong>{diffPlan.summary.conflicts}</strong></span></div><div className="maintenance-change-groups"><section><h3>Will update</h3><p>Starter changed these managed targets; your project did not.</p>{diffPlan.changes.length ? <ul>{diffPlan.changes.map((item, index) => <li key={`${item.target}-${index}`}>{changeLabel(item)}</li>)}</ul> : <p className="maintenance-none">No managed targets need changes.</p>}</section><section><h3>Will keep</h3><p>Your project owns these changes, so Starter will not overwrite them.</p>{diffPlan.preserved.length ? <ul>{diffPlan.preserved.map((item, index) => <li key={`${item.target}-${index}`}>{changeLabel(item)}</li>)}</ul> : <p className="maintenance-none">No customer-only changes were detected.</p>}</section><section className={diffPlan.summary.conflicts ? "has-conflicts" : "no-conflicts"}><h3>Blocked conflicts</h3><p>Any item here disables automatic update until reviewed.</p>{diffPlan.failures?.length ? <ul>{diffPlan.failures.map((failure) => <li key={failure}>{failure}</li>)}</ul> : <p className="maintenance-none">No conflicts. Automatic update is allowed.</p>}</section></div></> : null}
      {diff ? <details className="maintenance-diagnostics"><summary>Advanced diagnostics</summary><pre className="update-output">{diff}</pre></details> : null}
        {message && (
          <p className="update-message" role="status">
            {message}
          </p>
        )}
        <details>
          <summary>Legacy one-use token</summary>
          <label className="update-field">
            <span>Update token</span>
            <input
              value={legacyToken}
              onChange={(event) => {
                setLegacyToken(event.target.value);
                sessionStorage.setItem(
                  "starter.all2cf.updateToken",
                  event.target.value,
                );
              }}
              type="password"
              autoComplete="off"
            />
          </label>
        </details>
      </section>

      {available?.releaseNotes?.length ? <section className="update-card maintenance-release">
        <div>
          <FileText />
          <span>
            <h2>What changed</h2>
            <p>
              Release notes are returned by the authorized update service for
              the exact local-to-cloud version path.
            </p>
          </span>
        </div>
        <ul>
          {available.releaseNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section> : null}
    </main>
  );
}
