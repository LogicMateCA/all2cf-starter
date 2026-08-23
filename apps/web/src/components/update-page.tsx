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

  useEffect(() => {
    fetch("/__starter/update/receipt")
      .then(async (response) => {
        const payload = (await response.json()) as ActionResult;
        if (!response.ok || !payload.receipt) throw new Error(payload.error || "Could not read the Starter receipt.");
        setReceipt(payload.receipt);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

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
          <p className="eyebrow">STARTER UPDATE CENTER</p>
          <h1>更新项目</h1>
          <p>更新资格、版本清单和 Engine 均由 All2CF 提供。本地浏览器不会直接修改项目文件。</p>
        </div>
        <a className="button button-outline" href="/setup">返回 Setup</a>
      </header>

      <section className="update-grid">
        <article className="update-card">
          <h2>连接 All2CF</h2>
          <p>粘贴短期更新凭证。凭证只提交给本地开发服务，不写入项目文件。</p>
          <label className="update-field">
            <span>Update token</span>
            <input value={token} onChange={(event) => setToken(event.target.value)} type="password" autoComplete="off" placeholder="All2CF update token" />
          </label>
          <div className="update-actions">
            <Button onClick={connect} disabled={busy}>连接</Button>
            <Button variant="outline" onClick={() => void run("check")} disabled={busy || !token.trim()}>检查授权与版本</Button>
          </div>
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
          <Button variant="outline" onClick={() => void run("status")} disabled={busy || !token.trim()}>读取状态</Button>
        </article>
      </section>

      <section className="update-card update-plan">
        <div><h2>更新操作</h2><p>先预览，再应用。应用操作由本地开发服务调用维护客户端，并保留收据冲突保护。</p></div>
        <div className="update-actions">
          <Button variant="outline" onClick={() => void run("diff")} disabled={busy || !token.trim()}>查看差异</Button>
          <Button onClick={() => void run("update")} disabled={busy || !token.trim()}>应用更新</Button>
        </div>
        {output && <pre className="update-output">{output}</pre>}
        {message && <p className="update-message" role="status">{message}</p>}
      </section>
    </main>
  );
}
