import { authClient } from "../../lib/auth-client";
import { ProductShell } from "../product-shell";
import "./billing-page.css";

export function BillingPage() {
  const checkout = async () => { const result = await authClient.checkout({ slug: "pro" }); if (result.data?.url) window.location.assign(result.data.url); };
  const portal = async () => { const result = await authClient.customer.portal(); if (result.data?.url) window.location.assign(result.data.url); };
  return <ProductShell activePath="/app/billing"><main className="billing-shell"><header><span>Polar billing</span><h1>Billing</h1><p>Checkout, subscriptions, customer benefits and usage are managed by Polar.</p></header><section className="billing-actions"><button type="button" onClick={() => void checkout()}>Choose Pro</button><button type="button" className="billing-secondary" onClick={() => void portal()}>Open billing portal</button></section></main></ProductShell>;
}
