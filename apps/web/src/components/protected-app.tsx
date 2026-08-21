import { useEffect } from "react";
import { ProductShell } from "@/components/product-shell";
import { AccountSettings } from "@/components/account-settings";
import { NotificationCenter, RecentActivity } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function ProtectedApp() {
  const { data: session, isPending } = authClient.useSession();
  const settings = window.location.pathname === "/app/settings";
  const notifications = window.location.pathname === "/app/notifications";

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  }, [isPending, session]);

  if (isPending || !session?.user) return <main className="protected-loading"><span /><span /><span /></main>;

  return <ProductShell activePath={notifications ? undefined : window.location.pathname}>
    {settings ? <AccountSettings /> : notifications ? <main className="product-main"><section className="notifications-page"><header><h1>Notifications</h1><p>Your system, support, product, and billing updates.</p></header><NotificationCenter /></section></main> : <main className="product-main saas-dashboard"><header className="saas-dashboard-header"><div><h1>Workspace</h1><p>Start with the product module your project provides. Platform navigation and account controls are ready.</p></div><Button asChild><a href="/app/settings">Open settings</a></Button></header><div className="saas-dashboard-grid"><section className="saas-dashboard-card"><h2>Product module</h2><p>No product module has been connected yet. New project capabilities will appear here after they are selected and materialized.</p><small>Stable insertion point: <code>data-product-module-slot</code></small></section><section className="saas-dashboard-card"><h2>Recent activity</h2><RecentActivity /></section></div></main>}
  </ProductShell>;
}
