import { useEffect, useState } from "react";
import { ProductShell } from "../product-shell";
import { authClient } from "../../lib/auth-client";
import "./billing-page.css";

type Subscription = {
  id: string;
  plan: string;
  status: string;
  stripeSubscriptionId?: string | null;
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  trialStart?: string | Date | null;
  trialEnd?: string | Date | null;
  billingInterval?: string | null;
};

export function BillingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [annual, setAnnual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await authClient.subscription.list();
    if (result.error)
      setMessage(
        result.error.message || "Billing status could not be loaded.",
      );
    else setSubscriptions((result.data || []) as Subscription[]);
  }

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(window.location.pathname)}`,
      );
    if (session?.user) {
      if (new URLSearchParams(window.location.search).get("checkout") === "success")
        setMessage("Checkout completed. Waiting for the signed Stripe webhook projection.");
      void refresh();
    }
  }, [isPending, session?.user?.id]);

  async function subscribe() {
    setBusy(true);
    setMessage("");
    const result = await authClient.subscription.upgrade({
      plan: "pro",
      annual,
      successUrl: `${window.location.origin}/app/billing?checkout=success`,
      cancelUrl: `${window.location.origin}/app/billing`,
      returnUrl: `${window.location.origin}/app/billing`,
      disableRedirect: false,
    });
    if (result.error)
      setMessage(result.error.message || "Checkout could not be started.");
    setBusy(false);
  }

  async function portal() {
    setBusy(true);
    setMessage("");
    const result = await authClient.subscription.billingPortal({
      returnUrl: `${window.location.origin}/app/billing`,
      disableRedirect: false,
    });
    if (result.error)
      setMessage(
        result.error.message || "Billing Portal could not be opened.",
      );
    setBusy(false);
  }

  async function cancel(subscription: Subscription) {
    setBusy(true);
    setMessage("");
    const result = await authClient.subscription.cancel({
      subscriptionId: subscription.stripeSubscriptionId || undefined,
      returnUrl: `${window.location.origin}/app/billing`,
    });
    if (result.error)
      setMessage(
        result.error.message || "Cancellation could not be started.",
      );
    setBusy(false);
  }

  async function restore(subscription: Subscription) {
    setBusy(true);
    setMessage("");
    const result = await authClient.subscription.restore({
      subscriptionId: subscription.stripeSubscriptionId || undefined,
    });
    if (result.error)
      setMessage(result.error.message || "Subscription could not be restored.");
    else {
      setMessage("Subscription renewal restored.");
      await refresh();
    }
    setBusy(false);
  }

  if (isPending || !session?.user)
    return <main className="billing-loading">Loading billing…</main>;
  const active = subscriptions.find((item) =>
    ["active", "trialing"].includes(item.status),
  );
  return (
    <ProductShell activePath="/app/billing">
      <main className="billing-shell">
        <header>
          <span>Stripe subscription</span>
          <h1>Billing</h1>
          <p>
            Checkout and Portal actions come from Better Auth Stripe. Plan state
            is accepted only after a signed Stripe webhook updates PostgreSQL.
          </p>
        </header>
        <section className="billing-current">
          <div>
            <small>Current plan</small>
            <strong>{active ? active.plan : "Free"}</strong>
            <span>{active ? active.status : "No active subscription"}</span>
          </div>
          <div className="billing-actions">
            {active ? (
              <>
                <button type="button" disabled={busy} onClick={() => void portal()}>
                  Open Billing Portal
                </button>
                {active.cancelAtPeriodEnd ? (
                  <button type="button" className="billing-secondary" disabled={busy} onClick={() => void restore(active)}>
                    Restore renewal
                  </button>
                ) : (
                  <button type="button" className="billing-secondary" disabled={busy} onClick={() => void cancel(active)}>
                    Review cancellation
                  </button>
                )}
              </>
            ) : (
              <button type="button" disabled={busy} onClick={() => void subscribe()}>
                Upgrade to Pro
              </button>
            )}
          </div>
        </section>
        {!active ? (
          <section className="billing-plan">
            <div><strong>Pro</strong><span>Reusable paid-plan seam</span></div>
            <label><input type="checkbox" checked={annual} onChange={(event) => setAnnual(event.target.checked)} />Annual billing</label>
          </section>
        ) : null}
        {active ? (
          <section className="billing-details">
            <h2>Subscription details</h2>
            <dl>
              <div><dt>Interval</dt><dd>{active.billingInterval || "provider default"}</dd></div>
              <div><dt>Renews</dt><dd>{active.cancelAtPeriodEnd ? "Cancellation scheduled" : "Automatic"}</dd></div>
              <div><dt>Period end</dt><dd>{active.periodEnd ? new Date(active.periodEnd).toLocaleDateString() : "Pending webhook"}</dd></div>
              <div><dt>Trial</dt><dd>{active.trialEnd ? `Ends ${new Date(active.trialEnd).toLocaleDateString()}` : "None"}</dd></div>
            </dl>
          </section>
        ) : null}
        <section className="billing-history">
          <div><h2>Subscription history</h2><button type="button" className="billing-secondary" disabled={busy} onClick={() => void refresh()}>Refresh</button></div>
          {subscriptions.length ? <ul>{subscriptions.map((subscription) => <li key={subscription.id}><span><strong>{subscription.plan}</strong><small>{subscription.status}</small></span><time>{subscription.periodEnd ? new Date(subscription.periodEnd).toLocaleDateString() : "No period"}</time></li>)}</ul> : <p>No subscription records yet.</p>}
        </section>
        {message ? <p role="status" className="billing-message">{message}</p> : null}
      </main>
    </ProductShell>
  );
}
