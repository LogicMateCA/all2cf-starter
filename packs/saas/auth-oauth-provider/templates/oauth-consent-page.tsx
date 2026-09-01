import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import "./oauth-consent-page.css";
type PublicClient = {
  client_name?: string;
  client_id?: string;
  logo_uri?: string;
};
export function OAuthConsentPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = query.get("client_id") || "";
  const requestedScopes = (query.get("scope") || "").split(" ").filter(Boolean);
  const [client, setClient] = useState<PublicClient | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!clientId) {
      setError("The authorization request is missing a client ID.");
      return;
    }
    void authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then((result) => {
        if (result.error)
          setError("The requesting application could not be verified.");
        else setClient(result.data as PublicClient);
      });
  }, [clientId]);
  async function decide(accept: boolean) {
    setBusy(true);
    setError("");
    const claims = query.get("claims");
    const result = await authClient.oauth2.consent({
      accept,
      scope: requestedScopes.join(" "),
      ...(claims ? { claims } : {}),
    });
    if (result.error) {
      setError("The authorization decision could not be completed.");
      setBusy(false);
    }
  }
  return (
    <main className="oauth-consent">
      <section>
        <span>Authorization request</span>
        <h1>{client?.client_name || "Application access"}</h1>
        <p>
          This verified OAuth client requests access to the following account
          scopes.
        </p>
        <ul>
          {requestedScopes.map((scope) => (
            <li key={scope}>{scope}</li>
          ))}
        </ul>
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !client}
            onClick={() => void decide(false)}
          >
            Deny
          </Button>
          <Button
            type="button"
            disabled={busy || !client}
            onClick={() => void decide(true)}
          >
            {busy ? "Saving decision" : "Allow access"}
          </Button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </section>
    </main>
  );
}
