import { useEffect } from "react";
import { ProductShell } from "@/components/product-shell";
import { AccountSettings } from "@/components/account-settings";
import { NotificationCenter, RecentActivity } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useResilientSession } from "@/lib/use-resilient-session";
import { message } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";

export function ProtectedApp() {
  const { data: session, isPending } = useResilientSession();
  const { locale } = usePreferences();
  const settings = window.location.pathname === "/app/settings";
  const notifications = window.location.pathname === "/app/notifications";

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  }, [isPending, session]);

  if (isPending || !session?.user) return <main className="protected-loading"><span /><span /><span /></main>;

  return <ProductShell activePath={notifications ? undefined : window.location.pathname}>
    {settings ? <AccountSettings /> : notifications ? <main className="product-main"><section className="notifications-page"><header><h1>{message(locale, "notifications.title", "Notifications")}</h1><p>{locale === "zh" ? "你的系统、支持、产品和账单更新。" : "Your system, support, product, and billing updates."}</p></header><NotificationCenter /></section></main> : <main className="product-main saas-dashboard"><header className="saas-dashboard-header"><div><h1>{message(locale, "dashboard.title", "Workspace")}</h1><p>{message(locale, "dashboard.description", "Start with the product module your project provides. Platform navigation and account controls are ready.")}</p></div><Button asChild><a href="/app/settings">{message(locale, "dashboard.settings", "Open settings")}</a></Button></header><div className="saas-dashboard-grid"><section className="saas-dashboard-card"><h2>{message(locale, "dashboard.product-module", "Product module")}</h2><p>{message(locale, "dashboard.product-empty", "No product module has been connected yet. New project capabilities will appear here after they are selected and materialized.")}</p><small>Stable insertion point: <code>data-product-module-slot</code></small></section><section className="saas-dashboard-card"><h2>{message(locale, "dashboard.recent", "Recent activity")}</h2><RecentActivity /></section></div></main>}
  </ProductShell>;
}
