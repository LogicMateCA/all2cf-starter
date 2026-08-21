import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { ProductShell } from "@/components/product-shell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import "./api-keys-page.css";

type ApiKeyRow = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean | null;
  expiresAt: string | Date | null;
  createdAt: string | Date;
  lastRequest: string | Date | null;
};

export function ApiKeysPage() {
  const { data: session, isPending } = authClient.useSession();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState("7776000");
  const [createdKey, setCreatedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await authClient.apiKey.list({
      query: {
        limit: 50,
        offset: 0,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });
    if (result.error)
      setMessage(result.error.message || "API keys could not be loaded.");
    else setKeys((result.data?.apiKeys || []) as ApiKeyRow[]);
  }

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(window.location.pathname)}`,
      );
    if (session?.user) void refresh();
  }, [isPending, session?.user?.id]);

  async function createKey() {
    if (name.trim().length < 3) {
      setMessage("Use a name with at least three characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = await authClient.apiKey.create({
      name: name.trim(),
      ...(expiresIn ? { expiresIn: Number(expiresIn) } : {}),
    });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message || "API key could not be created.");
      return;
    }
    setCreatedKey(result.data?.key || "");
    setName("");
    await refresh();
  }

  async function revokeKey(keyId: string) {
    if (
      !window.confirm(
        "Revoke this API key? Requests using it will stop immediately.",
      )
    )
      return;
    const result = await authClient.apiKey.delete({ keyId });
    if (result.error) {
      setMessage(result.error.message || "API key could not be revoked.");
      return;
    }
    await refresh();
  }

  async function copyKey() {
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
  }

  if (isPending || !session?.user)
    return <main className="api-keys-loading">Loading API keys…</main>;

  return (
    <ProductShell activePath="/app/api-keys" enabledModules={["saas.api-keys"]}>
      <main className="api-keys-main">
        <header className="api-keys-intro">
          <div>
            <span>Developer access</span>
            <h1>API Keys</h1>
            <p>
              Keys are hashed by Better Auth and are never shown again after
              creation. The Starter default grants product read access only;
              copied products own their final permission vocabulary.
            </p>
          </div>
          <KeyRound size={24} aria-hidden="true" />
        </header>

        {createdKey ? (
          <section className="api-key-created" aria-live="polite">
            <div>
              <strong>Copy this key now</strong>
              <p>It cannot be recovered after you leave this page.</p>
            </div>
            <Button variant="outline" onClick={() => void copyKey()}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <code>{createdKey}</code>
            <button type="button" onClick={() => setCreatedKey("")}>
              I saved it
            </button>
          </section>
        ) : null}

        <section className="api-key-create">
          <label>
            <span>Key name</span>
            <input
              value={name}
              maxLength={48}
              placeholder="Production integration"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>Expiration</span>
            <select
              value={expiresIn}
              onChange={(event) => setExpiresIn(event.target.value)}
            >
              <option value="2592000">30 days</option>
              <option value="7776000">90 days</option>
              <option value="31536000">1 year</option>
              <option value="">No expiration</option>
            </select>
          </label>
          <Button disabled={busy} onClick={() => void createKey()}>
            <Plus size={15} /> {busy ? "Creating…" : "Create key"}
          </Button>
        </section>

        {message ? (
          <p className="api-key-message" role="alert">
            {message}
          </p>
        ) : null}

        <section className="api-key-list">
          <div>
            <h2>Active keys</h2>
            <span>{keys.length}</span>
          </div>
          {keys.length ? (
            keys.map((key) => (
              <article key={key.id}>
                <div>
                  <strong>{key.name || "Unnamed key"}</strong>
                  <code>{key.start || key.prefix || "app_"}••••••••</code>
                </div>
                <dl>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(key.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div>
                    <dt>Last used</dt>
                    <dd>
                      {key.lastRequest
                        ? new Date(key.lastRequest).toLocaleString()
                        : "Never"}
                    </dd>
                  </div>
                  <div>
                    <dt>Expires</dt>
                    <dd>
                      {key.expiresAt
                        ? new Date(key.expiresAt).toLocaleDateString()
                        : "Never"}
                    </dd>
                  </div>
                </dl>
                <Button
                  variant="ghost"
                  aria-label={`Revoke ${key.name || "API key"}`}
                  onClick={() => void revokeKey(key.id)}
                >
                  <Trash2 size={15} /> Revoke
                </Button>
              </article>
            ))
          ) : (
            <p className="api-key-empty">No API keys yet.</p>
          )}
        </section>
      </main>
    </ProductShell>
  );
}
