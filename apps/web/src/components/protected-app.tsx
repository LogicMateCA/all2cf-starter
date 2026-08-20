import { useEffect } from "react";
import { CircleDot } from "lucide-react";
import { AccountControl } from "@/components/account-control";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { usePreferences } from "@/lib/preferences";

function ProductBrand() {
  return <a className="brand" href="/"><span><CircleDot size={17} /></span><strong>Cloudflare AI Starter</strong></a>;
}

export function ProtectedApp() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const settings = window.location.pathname === "/app/settings";

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  }, [isPending, session]);

  if (isPending || !session?.user) return <main className="protected-loading"><span /><span /><span /></main>;

  return <div className="product-shell">
    <header className="product-header"><ProductBrand /><nav><a href="/app" aria-current={!settings ? "page" : undefined}>Workspace</a><a href="/app/settings" aria-current={settings ? "page" : undefined}>Settings</a><a href="/support">Support</a></nav><AccountControl compact /></header>
    <main className="product-main">
      {settings ? <section className="settings-page"><header><h1>Settings</h1><p>Personal preferences for this browser and account experience.</p></header><div className="settings-group"><div><h2>Appearance</h2><p>Choose how the interface looks.</p></div><div className="segmented-control" role="group" aria-label="Theme">{(["system", "light", "dark"] as const).map((value) => <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>{value}</button>)}</div></div><div className="settings-group"><div><h2>Language</h2><p>Choose the interface language.</p></div><div className="segmented-control" role="group" aria-label="Language"><button aria-pressed={locale === "en"} onClick={() => setLocale("en")}>English</button><button aria-pressed={locale === "zh"} onClick={() => setLocale("zh")}>简体中文</button></div></div></section> : <section className="workspace-page"><p className="workspace-kicker">Signed in securely</p><h1>Welcome, {session.user.name || session.user.email}</h1><p>This protected route is the neutral starting point for each new product workspace.</p><div className="workspace-actions"><Button asChild><a href="/dp">Open development plan</a></Button><Button variant="outline" asChild><a href="/app/settings">Account settings</a></Button></div></section>}
    </main>
  </div>;
}
