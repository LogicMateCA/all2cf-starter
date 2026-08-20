import { useEffect, useRef } from "react";
import { Check, Languages, Laptop, LifeBuoy, LogOut, Moon, Settings, ShieldCheck, Sun, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { usePreferences, type LocalePreference, type ThemePreference } from "@/lib/preferences";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const themeItems: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "system", label: "System", icon: Laptop },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const localeItems: Array<{ value: LocalePreference; label: string }> = [
  { value: "en", label: "English" },
  { value: "zh", label: "简体中文" },
];

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "U";
  return source.split(/\s+/u).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AccountControl({ compact = false }: { compact?: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const hydratedUser = useRef<string | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || hydratedUser.current === userId) return;
    let active = true;
    void fetch("/api/preferences", { credentials: "include" }).then(async (response) => response.ok ? response.json() as Promise<{ data: { theme: ThemePreference; locale: LocalePreference } }> : null).then((payload) => {
      if (!active || !payload) return;
      setTheme(payload.data.theme);
      setLocale(payload.data.locale);
      hydratedUser.current = userId;
    }).catch(() => undefined);
    return () => { active = false; };
  }, [session?.user?.id, setLocale, setTheme]);

  useEffect(() => {
    if (!session?.user?.id || hydratedUser.current !== session.user.id) return;
    void fetch("/api/preferences", { method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme, locale }) }).catch(() => undefined);
  }, [locale, session?.user?.id, theme]);

  if (isPending) return <span className="account-skeleton" aria-label="Loading account" />;
  if (!session?.user) return <Button asChild size={compact ? "sm" : "default"}><a href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}>Sign in</a></Button>;

  const user = session.user;
  const role = String("role" in user ? user.role || "" : "");
  const isAdmin = role.split(",").includes("admin");
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="account-trigger" aria-label="Open account menu">
        <Avatar size="sm"><AvatarImage src={user.image || undefined} alt="" /><AvatarFallback>{initials(user.name, user.email)}</AvatarFallback></Avatar>
        {compact ? null : <span>{user.name || user.email}</span>}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="account-menu">
      <DropdownMenuLabel className="account-identity"><strong>{user.name || "Account"}</strong><span>{user.email}</span></DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><a href="/app"><UserRound />Account</a></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="/app/settings"><Settings />Settings</a></DropdownMenuItem>
      <DropdownMenuItem asChild><a href="/support"><LifeBuoy />Support</a></DropdownMenuItem>
      {isAdmin ? <DropdownMenuItem asChild><a href="/admin"><ShieldCheck />Admin</a></DropdownMenuItem> : null}
      <DropdownMenuSub>
        <DropdownMenuSubTrigger><Sun />Theme</DropdownMenuSubTrigger>
        <DropdownMenuSubContent><DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemePreference)}>{themeItems.map(({ value, label, icon: Icon }) => <DropdownMenuRadioItem key={value} value={value}><Icon />{label}</DropdownMenuRadioItem>)}</DropdownMenuRadioGroup></DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger><Languages />Language</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>{localeItems.map(({ value, label }) => <DropdownMenuItem key={value} onSelect={() => setLocale(value)}>{locale === value ? <Check /> : <span className="menu-icon-space" />}{label}</DropdownMenuItem>)}</DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onSelect={() => void authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}><LogOut />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
