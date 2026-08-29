import { useEffect, useState } from "react";
import { ProductShell } from "@/components/product-shell";
import { authClient } from "@/lib/auth-client";
import "./usage-page.css";

type UsageSnapshot = {
  plan: { id: string; name: string };
  periodStart: string | null;
  periodEnd: string | null;
  meters: Array<{
    key: string;
    consumed: number;
    limit: number;
    remaining: number;
  }>;
};

export function UsagePage() {
  const { data: session, isPending } = authClient.useSession();
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      window.location.replace(
        `/login?returnTo=${encodeURIComponent("/app/usage")}`,
      );
      return;
    }
    void fetch("/api/usage/me", { credentials: "include" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          data?: UsageSnapshot;
          error?: { message?: string };
        };
        if (!response.ok)
          throw new Error(payload.error?.message || "Unable to load usage.");
        setSnapshot(payload.data || null);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [isPending, session?.user?.id]);
  return (
    <ProductShell activePath="/app/usage">
      <main className="usage-shell">
        <header>
          <span>Current billing period</span>
          <h1>Usage</h1>
          <p>
            Only completed server-side product actions consume quota. Page views
            and client claims never change these totals.
          </p>
        </header>
        {error ? <p role="alert">{error}</p> : null}
        {snapshot ? (
          <section>
            <div className="usage-plan">
              <small>Plan</small>
              <strong>{snapshot.plan.name}</strong>
            </div>
            {snapshot.meters.length ? (
              snapshot.meters.map((meter) => {
                const percentage = Math.min(
                  Math.round((meter.consumed / meter.limit) * 100),
                  100,
                );
                return (
                  <article key={meter.key}>
                    <div>
                      <strong>{meter.key}</strong>
                      <span>
                        {meter.consumed.toLocaleString()} /{" "}
                        {meter.limit.toLocaleString()}
                      </span>
                    </div>
                    <progress value={percentage} max="100">
                      {percentage}%
                    </progress>
                    <small>{meter.remaining.toLocaleString()} remaining</small>
                  </article>
                );
              })
            ) : (
              <p>No metered features are defined for this plan.</p>
            )}
          </section>
        ) : !error ? (
          <p>Loading usage…</p>
        ) : null}
      </main>
    </ProductShell>
  );
}
