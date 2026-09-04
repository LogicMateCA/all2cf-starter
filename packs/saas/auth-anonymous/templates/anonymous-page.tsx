import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import "./anonymous-page.css";

export function AnonymousSignInPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueAsGuest() {
    setBusy(true);
    setError("");
    const result = await authClient.signIn.anonymous();
    if (result.error) {
      setError("Unable to start a guest session.");
      setBusy(false);
      return;
    }
    window.location.assign("/app");
  }

  return (
    <main className="anonymous-auth">
      <section>
        <span>Optional guest access</span>
        <h1>Continue without an account</h1>
        <p>
          Guest data is temporary until this session is linked to a verified
          account.
        </p>
        <Button
          type="button"
          onClick={() => void continueAsGuest()}
          disabled={busy}
        >
          {busy ? "Starting guest session" : "Continue as guest"}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
