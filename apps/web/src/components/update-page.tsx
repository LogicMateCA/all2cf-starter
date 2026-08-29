import { useEffect, useState } from "react";
import { Button } from "./ui/button";

type Receipt = Record<string, unknown> & {
  engineVersion?: string;
  sourceCommit?: string;
  artifactSha256?: string;
  channelUrl?: string;
  updateServiceUrl?: string;
  updateMode?: string;
};

type ActionResult = {
  ok: boolean;
  output?: string;
  error?: string;
  entitlement?: { authorized?: boolean; [key: string]: unknown };
  receipt?: Receipt;
};
type ConnectionState = { ok: boolean; connected: boolean; mode: "independent" | "all2cf-connected"; expiresAt?: string | null; project?: { name?: string; slug?: string } };

async function callUpdate(path: string, token: string, method = "POST") {
  const response = await fetch(`/__starter/update/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "POST" ? JSON.stringify({ accessToken: token }) : undefined,
  });
  const payload = (await response.json()) as ActionResult;
  if (!response.ok || payload.ok === false) throw new Error(payload.error || `Update request failed (${response.status})`);
  return payload;
}

export function UpdatePage() {
  const [token, setToken] = useState(() => sessionStorage.getItem("starter.all2cf.updateToken") || "");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [entitlement, setEntitlement] = useState<ActionResult["entitlement"]>(undefined);
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connection, setConnection] = useState<ConnectionState | null>(null);

  useEffect(() => {
    fetch("/__starter/update/receipt")
      .then(async (response) => {
        const payload = (await response.json()) as ActionResult;
        if (!response.ok || !payload.receipt) throw new Error(payload.error || "Could not read the Starter receipt.");
        setReceipt(payload.receipt);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);
  async function refreshConnection() {
    const response = await fetch("/__starter/all2cf/status");
    const payload = await response.json() as ConnectionState & { error?: string };
    if (!response.ok) throw new Error(payload.error || "Could not read All2CF connection state.");
    setConnection(payload);
  }
  useEffect(() => { void refreshConnection().catch((error) => setMessage(error instanceof Error ? error.message : String(error))); }, []);

  async function importConnection(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const connection = JSON.parse(await file.text());
      const response = await fetch("/__starter/all2cf/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connection }) });
      const payload = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not connect All2CF.");
      await refreshConnection();
      setMessage("All2CF 已连接。项目运行仍然保持独立。");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function disconnectAll2cf() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/__starter/all2cf/disconnect", { method: "POST" });
      const payload = await response.json() as { ok?: boolean; remoteWarning?: string | null; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Could not disconnect All2CF.");
      sessionStorage.removeItem("starter.all2cf.updateToken"); setToken(""); setEntitlement(undefined);
      await refreshConnection();
      setMessage(payload.remoteWarning || "已断开 All2CF。项目文件、配置、数据库和发布资源均未改变。");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  }

  async function run(action: "check" | "status" | "diff" | "update") {
    setBusy(true);
    setMessage("");
    try {
      const result = await callUpdate(action, token);
      if (result.receipt) setReceipt(result.receipt);
      if (result.entitlement) setEntitlement(result.entitlement);
      if (result.output) setOutput(result.output);
      setMessage(action === "update" ? "更新已完成，请检查 Git diff 并运行项目验证。" : "检查完成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  function connect() {
    sessionStorage.setItem("starter.all2cf.updateToken", token.trim());
    setMessage(token.trim() ? "All2CF 凭证已连接，仅保存在当前浏览器会话。" : "请输入 All2CF 更新凭证。");
  }

  return (
    <main className="update-shell">
      <header className="update-header">
        <div>
          <p className="eyebrow">OPTIONAL ALL2CF CONNECTION</p>
          <h1>All2CF 项目连接</h1>
          <p>默认独立运行。连接只增加付费更新、云端状态与托管发布，不影响项目能否安装、构建或自行发布。</p>
        </div>
        <a className="button button-outline" href="/setup">返回 Setup</a>
      </header>

      <section className="update-grid">
        <article className="update-card">
          <h2>{connection?.connected ? "已连接 All2CF" : "独立运行"}</h2>
          <p>{connection?.connected ? `项目范围授权有效至 ${connection.expiresAt ? new Date(connection.expiresAt).toLocaleString() : "撤销为止"}。` : "没有 All2CF 运行时依赖，也不会发送项目状态。可随时导入云端卡片下载的连接文件。"}</p>
          <label className="update-field"><span>All2CF connection file</span><input type="file" accept="application/json,.json" disabled={busy} onChange={(event) => void importConnection(event.target.files?.[0])} /></label>
          <div className="update-actions"><Button variant="outline" onClick={() => void disconnectAll2cf()} disabled={busy || !connection?.connected}>断开连接</Button><a className="button button-outline" href="https://app.all2cf.com/deploy/projects" target="_blank" rel="noreferrer">打开云端卡片</a></div>
          <details><summary>兼容旧更新 Token</summary><p>旧项目仍可粘贴短期更新凭证；新项目优先使用连接文件。</p>
          <label className="update-field">
            <span>Update token</span>
            <input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" placeholder="All2CF update token" />
          </label>
          <div className="update-actions">
            <Button onClick={connect} disabled={busy}>连接</Button>
            <Button variant="outline" onClick={() => void run("check")} disabled={busy || !token.trim()}>检查授权与版本</Button>
          </div>
          </details>
          {entitlement && <p className={entitlement.authorized ? "update-ok" : "update-warning"}>{entitlement.authorized ? "已获得更新授权" : "当前凭证没有可用更新权益"}</p>}
        </article>

        <article className="update-card">
          <h2>当前收据</h2>
          {receipt ? <dl className="update-receipt">
            <div><dt>Engine</dt><dd>{receipt.engineVersion || "未记录"}</dd></div>
            <div><dt>Source commit</dt><dd>{receipt.sourceCommit || "未记录"}</dd></div>
            <div><dt>Artifact SHA-256</dt><dd>{receipt.artifactSha256 || "未记录"}</dd></div>
            <div><dt>Update service</dt><dd>{receipt.updateServiceUrl || receipt.channelUrl || "未记录"}</dd></div>
          </dl> : <p>尚未读取项目收据。</p>}
          <Button variant="outline" onClick={() => void run("status")} disabled={busy || (!connection?.connected && !token.trim())}>读取状态</Button>
        </article>
      </section>

      <section className="update-card update-plan">
        <div><h2>更新操作</h2><p>先预览，再应用。应用操作由本地开发服务调用维护客户端，并保留收据冲突保护。</p></div>
        <div className="update-actions">
          <Button variant="outline" onClick={() => void run("diff")} disabled={busy || (!connection?.connected && !token.trim())}>查看差异</Button>
          <Button onClick={() => void run("update")} disabled={busy || (!connection?.connected && !token.trim())}>应用更新</Button>
        </div>
        {output && <pre className="update-output">{output}</pre>}
        {message && <p className="update-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
