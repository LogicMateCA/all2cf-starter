import { useEffect, useState } from "react";
import { ProductShell } from "@/components/product-shell";
import { authClient } from "@/lib/auth-client";
import "./entitlements-page.css";

type AccessSnapshot = {
  plan: { id: string; name: string };
  entitlements: Array<{ key: string; enabled: boolean; limit: number | null }>;
};

export function EntitlementsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [snapshot, setSnapshot] = useState<AccessSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      window.location.replace(
        `/login?returnTo=${encodeURIComponent("/app/entitlements")}`,
      );
      return;
    }
    void fetch("/api/entitlements/me", { credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: AccessSnapshot;
          error?: { message?: string };
        };
        if (!response.ok)
          throw new Error(payload.error?.message || "Unable to load access.");
        setSnapshot(payload.data || null);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [isPending, session?.user?.id]);
  return (
    <ProductShell activePath="/app/entitlements">
      <main className="entitlements-shell">
        <header>
          <span>Server-authorized access</span>
          <h1>Plan & access</h1>
          <p>
            Features come from the verified subscription projection and the
            selected plan policy, never from client state.
          </p>
        </header>
        {error ? <p role="alert">{error}</p> : null}
        {snapshot ? (
          <section>
            <div>
              <small>Current plan</small>
              <strong>{snapshot.plan.name}</strong>
            </div>
            <ul>
              {snapshot.entitlements.map((item) => (
                <li key={item.key}>
                  <span>{item.key}</span>
                  <strong>
                    {item.enabled
                      ? item.limit === null
                        ? "Enabled"
                        : item.limit.toLocaleString()
                      : "Disabled"}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        ) : !error ? (
          <p>Loading access…</p>
        ) : null}
      </main>
    </ProductShell>
  );
}
