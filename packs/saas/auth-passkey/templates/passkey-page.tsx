import { useEffect, useState } from "react";
import { ProductShell } from "../product-shell";
import { authClient } from "../../lib/auth-client";
import "./passkey-page.css";

type PasskeyRow = {
  id: string;
  name?: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt?: string | Date | null;
};

export function PasskeySignInPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    setBusy(true);
    setError("");
    const result = await authClient.signIn.passkey({
      fetchOptions: { onSuccess: () => window.location.replace("/app") },
    });
    if (result?.error)
      setError(result.error.message || "Passkey sign-in failed.");
    setBusy(false);
  };
  return (
    <main className="passkey-entry">
      <a href="/login">← Other sign-in methods</a>
      <h1>Sign in with a passkey</h1>
      <p>Use a device passkey, security key, or password manager.</p>
      <button type="button" disabled={busy} onClick={() => void signIn()}>
        {busy ? "Waiting for authenticator…" : "Continue with passkey"}
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </main>
  );
}

export function PasskeySettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [items, setItems] = useState<PasskeyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = async () => {
    const result = await authClient.passkey.listUserPasskeys();
    if (result.error)
      setMessage(result.error.message || "Passkeys could not be loaded.");
    else setItems((result.data || []) as PasskeyRow[]);
  };
  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(location.pathname)}`,
      );
    else if (session?.user) void load();
  }, [isPending, session?.user?.id]);
  const add = async () => {
    setBusy(true);
    setMessage("");
    const result = await authClient.passkey.addPasskey({ name: "My passkey" });
    if (result?.error)
      setMessage(result.error.message || "Passkey could not be added.");
    else {
      setMessage("Passkey added.");
      await load();
    }
    setBusy(false);
  };
  const remove = async (id: string) => {
    setBusy(true);
    const result = await authClient.passkey.deletePasskey({ id });
    if (result.error)
      setMessage(result.error.message || "Passkey could not be removed.");
    else await load();
    setBusy(false);
  };
  if (isPending || !session?.user)
    return <main className="passkey-entry">Loading passkeys…</main>;
  return (
    <ProductShell activePath="/app/settings">
      <main className="passkey-settings">
        <header>
          <span>Account security</span>
          <h1>Passkeys</h1>
          <p>
            Passkeys stay on your authenticator. Starter stores only the public
            credential.
          </p>
          <button type="button" disabled={busy} onClick={() => void add()}>
            Add passkey
          </button>
        </header>
        <section>
          <h2>Registered passkeys</h2>
          {items.length ? (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name || "Passkey"}</strong>
                    <small>
                      {item.deviceType} ·{" "}
                      {item.backedUp ? "synced backup" : "device bound"}
                    </small>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(item.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No passkeys registered.</p>
          )}
        </section>
        {message ? <p role="status">{message}</p> : null}
      </main>
    </ProductShell>
  );
}
