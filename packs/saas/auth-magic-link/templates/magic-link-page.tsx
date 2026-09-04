import { FormEvent, useState } from "react";
import { authClient } from "../../lib/auth-client";
import "./magic-link-page.css";

export function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await authClient.signIn.magicLink({
      email: email.trim().toLowerCase(),
      callbackURL: "/app",
      newUserCallbackURL: "/app/onboarding",
      errorCallbackURL: "/magic-link?error=invalid",
    });
    setMessage(
      result?.error
        ? result.error.message || "Magic link could not be sent."
        : "Check your email for a one-time sign-in link.",
    );
    setBusy(false);
  };
  return (
    <main className="magic-link-entry">
      <a href="/login">← Other sign-in methods</a>
      <form onSubmit={submit}>
        <span>Passwordless access</span>
        <h1>Email magic link</h1>
        <p>The link works once and expires after ten minutes.</p>
        <label>
          Email
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button disabled={busy} type="submit">
          {busy ? "Sending…" : "Send magic link"}
        </button>
        {message ? <p role="status">{message}</p> : null}
      </form>
    </main>
  );
}
