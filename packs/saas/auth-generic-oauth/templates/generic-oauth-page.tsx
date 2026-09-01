import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import "./generic-oauth-page.css";

type Provider = { providerId: string; name: string };
export function GenericOAuthPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/generic-oauth/providers").then(async (response) => {
    if (!response.ok) throw new Error("Provider configuration is unavailable.");
    return response.json() as Promise<{ providers: Provider[] }>;
  }).then((payload) => setProviders(payload.providers)).catch((caught: Error) => setError(caught.message)); }, []);
  async function signIn(provider: Provider) {
    setError("");
    const result = await authClient.signIn.social({ provider: provider.providerId, callbackURL: "/app" });
    if (result.error) setError(`Unable to continue with ${provider.name}.`);
  }
  return <main className="generic-oauth"><section><span>Enterprise sign-in</span><h1>Choose your identity provider</h1><p>Each connection is configured by the project operator and uses PKCE with a fixed provider identity.</p><div>{providers.map((provider) => <Button type="button" variant="outline" key={provider.providerId} onClick={() => void signIn(provider)}>Continue with {provider.name}</Button>)}</div>{error ? <p role="alert">{error}</p> : null}</section></main>;
}
