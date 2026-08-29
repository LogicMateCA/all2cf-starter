import { useEffect, useMemo, useState } from "react";
import { ProductShell } from "../product-shell";
import { authClient } from "../../lib/auth-client";
import "./two-factor.css";

function secretFromUri(uri: string) {
  try {
    return new URL(uri).searchParams.get("secret") || "";
  } catch {
    return "";
  }
}

export function TwoFactorSettings() {
  const { data: session, isPending } = authClient.useSession();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const enabled = Boolean(
    session?.user &&
      "twoFactorEnabled" in session.user &&
      session.user.twoFactorEnabled,
  );
  const manualSecret = useMemo(() => secretFromUri(totpUri), [totpUri]);

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(window.location.pathname)}`,
      );
  }, [isPending, session?.user?.id]);

  async function enable() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.enable({
      password,
      method: "totp",
    });
    if (result.error)
      setError(result.error.message || "Two-factor setup could not start.");
    else if (result.data?.method === "totp") {
      setTotpUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
      setMessage("Add the account to your authenticator, then verify one code.");
    }
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.verifyTotp({
      code: code.trim(),
      trustDevice: false,
    });
    if (result.error)
      setError(result.error.message || "The authenticator code is invalid.");
    else {
      setMessage("Two-factor authentication enabled.");
      setCode("");
      setTotpUri("");
      await authClient.getSession({ query: { disableCookieCache: true } });
      window.location.reload();
    }
    setBusy(false);
  }

  async function regenerate() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.generateBackupCodes({ password });
    if (result.error)
      setError(result.error.message || "Backup codes could not be regenerated.");
    else {
      setBackupCodes(result.data?.backupCodes || []);
      setMessage("Previous backup codes are now invalid.");
    }
    setBusy(false);
  }

  async function disable() {
    setBusy(true);
    setError("");
    setMessage("");
    const result = await authClient.twoFactor.disable({ password });
    if (result.error)
      setError(result.error.message || "Two-factor authentication could not be disabled.");
    else {
      setMessage("Two-factor authentication disabled.");
      setBackupCodes([]);
      setPassword("");
      await authClient.getSession({ query: { disableCookieCache: true } });
      window.location.reload();
    }
    setBusy(false);
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copied.");
  }

  if (isPending || !session?.user)
    return <main className="two-factor-loading">Loading account security…</main>;
  return (
    <ProductShell activePath="/app/settings">
      <main className="two-factor-shell">
        <header>
          <span>Account security</span>
          <h1>Two-factor authentication</h1>
          <p>
            Protect password sign-in with a TOTP authenticator, recovery codes,
            trusted-device policy, and account-level failed-attempt lockout.
          </p>
        </header>
        <section className="two-factor-status">
          <div>
            <small>Status</small>
            <strong>{enabled ? "Enabled" : "Not enabled"}</strong>
          </div>
          <a href="/app/settings">Back to account settings</a>
        </section>
        <section>
          <h2>{enabled ? "Manage two-factor" : "Set up an authenticator"}</h2>
          <label>
            Confirm your password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {!enabled && !totpUri ? (
            <button type="button" disabled={busy || !password} onClick={() => void enable()}>
              Start TOTP setup
            </button>
          ) : null}
          {enabled ? (
            <div className="two-factor-actions">
              <button type="button" disabled={busy || !password} onClick={() => void regenerate()}>
                Generate new backup codes
              </button>
              <button type="button" className="two-factor-danger" disabled={busy || !password} onClick={() => void disable()}>
                Disable two-factor
              </button>
            </div>
          ) : null}
        </section>
        {totpUri ? (
          <section>
            <h2>Authenticator enrollment</h2>
            <p>
              Open the standard URI on this device or enter the secret manually
              in your authenticator app.
            </p>
            <div className="two-factor-secret">
              <code>{manualSecret}</code>
              <button type="button" onClick={() => void copy(manualSecret)}>Copy secret</button>
              <a href={totpUri}>Open authenticator URI</a>
            </div>
            <label>
              Six-digit code
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/gu, ""))}
              />
            </label>
            <button type="button" disabled={busy || code.length !== 6} onClick={() => void verify()}>
              Verify and enable
            </button>
          </section>
        ) : null}
        {backupCodes.length ? (
          <section>
            <h2>Recovery codes</h2>
            <p>Each code works once. Store them outside this application.</p>
            <div className="backup-code-grid">
              {backupCodes.map((backupCode) => <code key={backupCode}>{backupCode}</code>)}
            </div>
            <button type="button" className="two-factor-secondary" onClick={() => void copy(backupCodes.join("\n"))}>
              Copy all codes
            </button>
          </section>
        ) : null}
        {error ? <p className="two-factor-error" role="alert">{error}</p> : null}
        {message ? <p className="two-factor-message" role="status">{message}</p> : null}
      </main>
    </ProductShell>
  );
}
