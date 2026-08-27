import { ProductShell } from "../product-shell";
import "./billing-page.css";
import { AutumnProvider, useCustomer } from "autumn-js/react";

function AutumnBillingContent() {
  const { attach, openBillingPortal } = useCustomer();
  return <main className="billing-shell"><header><span>Autumn billing</span><h1>Billing</h1><p>Plans, usage, entitlements and Stripe-backed checkout are managed by Autumn.</p></header><section className="billing-actions"><button type="button" onClick={() => void attach({ planId: "pro" })}>Choose Pro</button><button type="button" className="billing-secondary" onClick={() => void openBillingPortal({ returnUrl: "/app/billing" })}>Open billing portal</button></section></main>;
}

export function BillingPage() {
  return <ProductShell activePath="/app/billing"><AutumnProvider useBetterAuth><AutumnBillingContent /></AutumnProvider></ProductShell>;
}
