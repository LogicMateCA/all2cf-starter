import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clipboard, Cloud, Download, ExternalLink, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { Button } from "./ui/button";

type Receipt = Record<string, unknown> & { engineVersion?: string; sourceCommit?: string; artifactSha256?: string; channelUrl?: string; updateServiceUrl?: string; updateMode?: string };
type ActionResult = { ok: boolean; output?: string; error?: string; entitlement?: { authorized?: boolean; plan?: string; features?: string[]; [key: string]: unknown }; receipt?: Receipt };
type ConnectionState = { ok: boolean; connected: boolean; mode: "independent" | "all2cf-connected"; workspace?: "generated-project" | "canonical-source"; expiresAt?: string | null; projectId?: string | null; installationId?: string | null; project?: { name?: string; slug?: string }; runtimeDependency?: boolean };

const codexPrompt = `Open this project's local /maintenance page. Read CODEX.md and AGENTS.md first. Use the installed All2CF Project plugin and hosted All2CF MCP to authenticate with OAuth, identify this project from .starter/source.json, verify my paid entitlement, obtain a project-scoped connection receipt, and connect it with npm run all2cf:connect -- <receipt-path>. Never print or commit the token. Then reload /maintenance and report the connection, plan, enabled paid capabilities, update channel, and expiry. Use official Cloudflare MCP for Cloudflare resources.`;

async function callUpdate(path: string, token: string, method = "POST") {
  const response = await fetch(`/__starter/update/${path}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? JSON.stringify({ accessToken: token }) : undefined });
  const payload = (await response.json()) as ActionResult;
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Update request failed (${response.status})`);
  return payload;
}

export function UpdatePage() {
  const [legacyToken, setLegacyToken] = useState(() => sessionStorage.getItem("starter.all2cf.updateToken") || "");
  const [connectionText, setConnectionText] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [entitlement, setEntitlement] = useState<ActionResult["entitlement"]>();
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const connected = Boolean(connection?.connected);
  const credentialAvailable = connected || Boolean(legacyToken.trim());
  const expiry = useMemo(() => connection?.expiresAt ? new Date(connection.expiresAt).toLocaleString() : "Until revoked", [connection?.expiresAt]);

  useEffect(() => { fetch("/__starter/update/receipt").then(async (response) => { const payload = (await response.json()) as ActionResult; if (!response.ok || !payload.receipt) throw new Error(payload.error || "Could not read the Starter receipt."); setReceipt(payload.receipt); }).catch((error) => setMessage(error instanceof Error ? error.message : String(error))); }, []);
  async function refreshConnection() { const response = await fetch("/__starter/all2cf/status"); const payload = await response.json() as ConnectionState & { error?: string }; if (!response.ok) throw new Error(payload.error || "Could not read All2CF connection state."); setConnection(payload); }
  useEffect(() => { void refreshConnection().catch((error) => setMessage(error instanceof Error ? error.message : String(error))); }, []);

  async function importConnection(connectionReceipt: unknown) {
    setBusy(true); setMessage("");
    try { const response = await fetch("/__starter/all2cf/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connection: connectionReceipt }) }); const payload = await response.json() as { ok?: boolean; error?: string }; if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not connect All2CF."); setConnectionText(""); await refreshConnection(); setMessage("All2CF connected. The project remains independently runnable."); }
    catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }
  async function importFile(file?: File) { if (file) await importConnection(JSON.parse(await file.text())); }
  async function importText() { try { await importConnection(JSON.parse(connectionText)); } catch (error) { setMessage(error instanceof Error ? error.message : "Invalid connection receipt."); } }
  async function copyCodexPrompt() { await navigator.clipboard.writeText(codexPrompt); setMessage("Codex MCP connection prompt copied."); }
  async function disconnect() { setBusy(true); setMessage(""); try { const response = await fetch("/__starter/all2cf/disconnect", { method: "POST" }); const payload = await response.json() as { ok?: boolean; remoteWarning?: string | null; error?: string }; if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not disconnect All2CF."); sessionStorage.removeItem("starter.all2cf.updateToken"); setLegacyToken(""); setEntitlement(undefined); await refreshConnection(); setMessage(payload.remoteWarning || "All2CF disconnected. Project files, data, providers and deployment ownership are unchanged."); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } }
  async function run(action: "check" | "status" | "diff" | "update") { setBusy(true); setMessage(""); try { const result = await callUpdate(action, legacyToken); if (result.receipt) setReceipt(result.receipt); if (result.entitlement) setEntitlement(result.entitlement); if (result.output) setOutput(result.output); setMessage(action === "update" ? "Update applied. Review Git diff and run project verification." : "Check completed."); } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); } }
  function saveLegacyToken() { sessionStorage.setItem("starter.all2cf.updateToken", legacyToken.trim()); setMessage(legacyToken.trim() ? "Legacy token retained in this browser session only." : "Enter an update token."); }

  return <main className="update-shell maintenance-shell">
    <header className="update-header"><div><p className="eyebrow">PROJECT MAINTENANCE</p><h1>All2CF connection and updates</h1><p>The project runs independently. Connect a paid All2CF account only for authorized MCP tools, private Starter updates and future managed services.</p></div><a className="button button-outline" href="/setup">Back to Setup</a></header>

    <section className="maintenance-status" aria-label="Connection status">
      <div className={connected ? "connected" : "independent"}>{connected ? <CheckCircle2 /> : <ShieldCheck />}<span><small>Project mode</small><strong>{connected ? "All2CF connected" : connection?.workspace === "canonical-source" ? "Source workspace" : "Independent"}</strong></span></div>
      <div><Cloud /><span><small>Hosted MCP</small><strong>OAuth + project token</strong></span></div>
      <div><Link2 /><span><small>Project authorization</small><strong>{connected ? expiry : "Not connected"}</strong></span></div>
      <div><ShieldCheck /><span><small>Runtime dependency</small><strong>None</strong></span></div>
    </section>

    <section className="update-grid maintenance-connect-grid">
      <article className="update-card maintenance-primary"><div className="maintenance-card-heading"><Link2 /><div><h2>Connect with Codex and All2CF MCP</h2><p>Recommended for Codex. OAuth proves the All2CF user; the MCP issues a project-scoped connection receipt only after checking project ownership and paid entitlement.</p></div></div><ol><li>Open this local <code>/maintenance</code> page.</li><li>Give Codex the connection prompt below.</li><li>Codex uses All2CF MCP, saves the ignored receipt and reloads this page.</li></ol><pre className="maintenance-prompt">{codexPrompt}</pre><div className="update-actions"><Button onClick={() => void copyCodexPrompt()}><Clipboard size={16} />Copy Codex prompt</Button><a className="button button-outline" href="https://app.all2cf.com/deploy/projects" target="_blank" rel="noreferrer">Open All2CF projects <ExternalLink size={15} /></a></div></article>

      <article className="update-card"><h2>Manual project receipt</h2><p>Use this fallback for another AI, IDE or a manually downloaded project connection receipt. It contains the project token and is stored only in the ignored local authorization file.</p><label className="update-field"><span>Connection file</span><input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void importFile(event.target.files?.[0])} /></label><label className="update-field"><span>Or paste the connection JSON</span><textarea rows={7} value={connectionText} onChange={(event) => setConnectionText(event.target.value)} placeholder='{"schemaVersion":"all2cf-project-connection/v1", ...}' /></label><div className="update-actions"><Button onClick={() => void importText()} disabled={busy || !connectionText.trim()}>Connect receipt</Button><Button variant="outline" onClick={() => void disconnect()} disabled={busy || !connected}><Unplug size={15} />Disconnect</Button></div></article>
    </section>

    <section className="update-grid">
      <article className="update-card"><h2>Paid authorization</h2><p>All2CF evaluates the subscription on the server. A local token never grants features by itself.</p>{entitlement ? <dl className="update-receipt"><div><dt>Authorized</dt><dd>{entitlement.authorized ? "Yes" : "No"}</dd></div><div><dt>Plan</dt><dd>{String(entitlement.plan || "Not reported")}</dd></div><div><dt>Capabilities</dt><dd>{entitlement.features?.join(", ") || "Not reported"}</dd></div></dl> : <p className="update-warning">Run Check update to resolve current entitlement.</p>}<Button variant="outline" onClick={() => void run("check")} disabled={busy || !credentialAvailable}><RefreshCw size={15} />Check authorization</Button><details><summary>Legacy one-use token</summary><label className="update-field"><span>Update token</span><input value={legacyToken} onChange={(event) => setLegacyToken(event.target.value)} type="password" autoComplete="off" placeholder="All2CF update token" /></label><Button onClick={saveLegacyToken} disabled={busy}>Use this session</Button></details></article>
      <article className="update-card"><h2>Installed receipt</h2>{receipt ? <dl className="update-receipt"><div><dt>Engine</dt><dd>{receipt.engineVersion || "Not recorded"}</dd></div><div><dt>Source commit</dt><dd>{receipt.sourceCommit || "Not recorded"}</dd></div><div><dt>Artifact SHA-256</dt><dd>{receipt.artifactSha256 || "Not recorded"}</dd></div><div><dt>Update service</dt><dd>{receipt.updateServiceUrl || receipt.channelUrl || "Not recorded"}</dd></div></dl> : <p>Starter receipt unavailable.</p>}<Button variant="outline" onClick={() => void run("status")} disabled={busy || !credentialAvailable}>Read update status</Button></article>
    </section>

    <section className="update-card update-plan"><div><h2>Preview before applying</h2><p>All2CF authorizes the Engine. The local updater owns conflict checks, diff and file application. Project source is not uploaded.</p></div><div className="update-actions"><Button variant="outline" onClick={() => void run("diff")} disabled={busy || !credentialAvailable}>View diff</Button><Button onClick={() => void run("update")} disabled={busy || !credentialAvailable}><Download size={15} />Apply authorized update</Button></div>{output && <pre className="update-output">{output}</pre>}{message && <p className="update-message" role="status">{message}</p>}</section>
  </main>;
}
