import { useEffect, useState } from "react";
import { ArrowRight, Check, Circle } from "lucide-react";
import { ProductShell } from "@/components/product-shell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import "./onboarding-page.css";

type OnboardingState = {
  definition: {
    version: number;
    steps: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel?: string;
      actionHref?: string;
    }>;
  };
  completedSteps: string[];
  complete: boolean;
  nextStepId: string | null;
};

export function OnboardingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestedReturnTo = new URLSearchParams(window.location.search).get("returnTo") || "/app";
  const returnTo =
    requestedReturnTo.startsWith("/") && !requestedReturnTo.startsWith("//")
      ? requestedReturnTo
      : "/app";

  const load = async () => {
    const response = await fetch("/api/onboarding", { credentials: "include" });
    const payload = (await response.json()) as {
      data?: OnboardingState;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message || "Unable to load onboarding.");
    setState(payload.data || null);
  };

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
      );
      return;
    }
    void load().catch((cause) =>
      setError(cause instanceof Error ? cause.message : String(cause)),
    );
  }, [isPending, session?.user?.id]);

  const completeStep = async (stepId: string) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId }),
      });
      const payload = (await response.json()) as {
        data?: OnboardingState;
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(payload.error?.message || "Unable to save progress.");
      setState(payload.data || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProductShell activePath="/app/onboarding">
      <main className="onboarding-shell">
        <header>
          <span>First successful session</span>
          <h1>Set up your workspace</h1>
          <p>
            This resumable flow is defined by the product, stored against your
            account, and completed in order.
          </p>
        </header>
        {error ? <p className="onboarding-error" role="alert">{error}</p> : null}
        <section className="onboarding-card">
          {state?.definition.steps.map((step, index) => {
            const complete = state.completedSteps.includes(step.id);
            const current = state.nextStepId === step.id;
            return (
              <article key={step.id} data-current={current} data-complete={complete}>
                <div className="onboarding-index">
                  {complete ? <Check size={17} /> : <Circle size={17} />}
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.description}</p>
                  {current && step.actionHref ? (
                    <a href={step.actionHref}>{step.actionLabel || "Open"} <ArrowRight size={14} /></a>
                  ) : null}
                </div>
                {current ? (
                  <Button onClick={() => void completeStep(step.id)} disabled={busy}>
                    Mark complete
                  </Button>
                ) : complete ? <strong>Done</strong> : <small>Next</small>}
              </article>
            );
          })}
          {state?.complete ? (
            <footer>
              <div><strong>Setup complete</strong><span>Your progress is saved.</span></div>
              <Button onClick={() => window.location.assign(returnTo)}>Enter workspace <ArrowRight size={15} /></Button>
            </footer>
          ) : null}
        </section>
      </main>
    </ProductShell>
  );
}
