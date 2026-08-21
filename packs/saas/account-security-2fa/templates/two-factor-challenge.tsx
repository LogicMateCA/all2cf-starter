import { useState, type FormEvent } from "react";
import { authClient } from "../../lib/auth-client";
import "./two-factor.css";

function safeReturnTo() {
  const candidate =
    new URLSearchParams(window.location.search).get("returnTo") || "/app";
  return candidate.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/app";
}

export function TwoFactorChallenge() {
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function verify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result =
      method === "totp"
        ? await authClient.twoFactor.verifyTotp({
            code: code.trim(),
            trustDevice,
          })
        : await authClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            trustDevice,
          });
    if (result.error)
      setError(
        result.error.code === "ACCOUNT_TEMPORARILY_LOCKED"
          ? "Too many failed attempts. Try again after the temporary lock expires."
          : result.error.message || "The verification code is invalid.",
      );
    else window.location.replace(safeReturnTo());
    setBusy(false);
  }

  return (
    <main className="two-factor-challenge">
      <a href="/login">Back to sign in</a>
      <header>
        <span>Second factor</span>
        <h1>Verify your identity</h1>
        <p>Complete the pending sign-in with your authenticator or one recovery code.</p>
      </header>
      <div className="two-factor-methods" role="group" aria-label="Verification method">
        <button type="button" aria-pressed={method === "totp"} onClick={() => { setMethod("totp"); setCode(""); setError(""); }}>Authenticator</button>
        <button type="button" aria-pressed={method === "backup"} onClick={() => { setMethod("backup"); setCode(""); setError(""); }}>Recovery code</button>
      </div>
      <form onSubmit={verify}>
        <label>
          {method === "totp" ? "Six-digit code" : "Recovery code"}
          <input
            autoFocus
            inputMode={method === "totp" ? "numeric" : "text"}
            autoComplete="one-time-code"
            maxLength={method === "totp" ? 6 : 64}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        </label>
        <label className="two-factor-trust">
          <input type="checkbox" checked={trustDevice} onChange={(event) => setTrustDevice(event.target.checked)} />
          Trust this device for 30 days
        </label>
        {error ? <p className="two-factor-error" role="alert">{error}</p> : null}
        <button type="submit" disabled={busy || !code.trim()}>{busy ? "Verifying…" : "Continue"}</button>
      </form>
    </main>
  );
}
