import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import "./billing-page.css";

type Subscription = { id: string; plan: string; status: string; periodEnd?: string | Date | null; cancelAtPeriodEnd?: boolean | null };

export function BillingPage() {
  const { data: session, isPending } = authClient.useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await authClient.subscription.list();
    if (result.error) setMessage(result.error.message || "Billing status could not be loaded.");
    else setSubscriptions(result.data || []);
  }

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    if (session?.user) void refresh();
  }, [isPending, session?.user?.id]);

  async function subscribe() {
    const result = await authClient.subscription.upgrade({ plan: "pro", successUrl: `${window.location.origin}/app/billing?checkout=success`, cancelUrl: `${window.location.origin}/app/billing`, disableRedirect: false });
    if (result.error) setMessage(result.error.message || "Checkout could not be started.");
  }

  async function portal() {
    const result = await authClient.subscription.billingPortal({ returnUrl: `${window.location.origin}/app/billing`, disableRedirect: false });
    if (result.error) setMessage(result.error.message || "Billing Portal could not be opened.");
  }

  if (isPending || !session?.user) return <main className="billing-loading">Loading billing…</main>;
  const active = subscriptions.find((item) => item.status === "active" || item.status === "trialing");
  return <main className="billing-shell"><a href="/app">← Workspace</a><header><p>Stripe Checkout</p><h1>Billing</h1><span>Subscriptions are derived from verified Stripe webhook events, never from client state.</span></header><section><div><strong>{active ? active.plan : "Free"}</strong><small>{active ? active.status : "No active subscription"}</small></div>{active ? <button type="button" onClick={() => void portal()}>Manage in Billing Portal</button> : <button type="button" onClick={() => void subscribe()}>Upgrade to Pro</button>}</section>{active?.periodEnd ? <p>Current period ends {new Date(active.periodEnd).toLocaleDateString()}.</p> : null}{message ? <p role="alert">{message}</p> : null}</main>;
}
