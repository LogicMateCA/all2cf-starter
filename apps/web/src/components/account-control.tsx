import { useEffect, useRef } from "react";
import {
  Check,
  Languages,
  Laptop,
  LifeBuoy,
  LogOut,
  Moon,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { message } from "@/lib/i18n";
import {
  usePreferences,
  type LocalePreference,
  type ThemePreference,
} from "@/lib/preferences";
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

const themeItems: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
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
  return source
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AccountControl({ compact = false }: { compact?: boolean }) {
  const { data: session, isPending } = authClient.useSession();
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const hydratedUser = useRef<string | null>(null);
  const persistedPreferences = useRef<{ theme: ThemePreference; locale: LocalePreference } | null>(null);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || hydratedUser.current === userId) return;
    let active = true;
    void fetch("/api/preferences", { credentials: "include" })
      .then(async (response) =>
        response.ok
          ? (response.json() as Promise<{
              data: { theme: ThemePreference; locale: LocalePreference };
            }>)
          : null,
      )
      .then((payload) => {
        if (!active || !payload) return;
        persistedPreferences.current = payload.data;
        setTheme(payload.data.theme);
        setLocale(payload.data.locale);
        hydratedUser.current = userId;
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [session?.user?.id, setLocale, setTheme]);

  useEffect(() => {
    if (!session?.user?.id || hydratedUser.current !== session.user.id) return;
    if (persistedPreferences.current?.theme === theme && persistedPreferences.current?.locale === locale) return;
    void fetch("/api/preferences", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme, locale }),
    }).then((response) => {
      if (response.ok) persistedPreferences.current = { theme, locale };
    }).catch(() => undefined);
  }, [locale, session?.user?.id, theme]);

  if (isPending)
    return <span className="account-skeleton" aria-label="Loading account" />;
  if (!session?.user)
    return (
      <Button asChild size={compact ? "sm" : "default"}>
        <a
          href={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}
        >
          {message(locale, "account.sign-in", "Sign in")}
        </a>
      </Button>
    );

  const user = session.user;
  const role = String("role" in user ? user.role || "" : "");
  const isAdmin = role.split(",").includes("admin");
  const impersonatedBy =
    "impersonatedBy" in session.session
      ? String(session.session.impersonatedBy || "")
      : "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="account-trigger"
          aria-label={message(locale, "account.open", "Open account menu")}
        >
          <Avatar size="sm">
            <AvatarImage src={user.image || undefined} alt="" />
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          {compact ? null : <span>{user.name || user.email}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="account-menu">
        <DropdownMenuLabel className="account-identity">
          <strong>{user.name || message(locale, "account.account", "Account")}</strong>
          <span>{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {impersonatedBy ? (
          <>
            <DropdownMenuLabel className="account-impersonation">
              Temporary impersonation session
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() =>
                void authClient.admin.stopImpersonating({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/admin";
                    },
                  },
                })
              }
            >
              <RotateCcw /> Return to Admin
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <a href="/app">
            <UserRound />
            {message(locale, "account.account", "Account")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/app/settings">
            <Settings />
            {message(locale, "account.settings", "Settings")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/support">
            <LifeBuoy />
            {message(locale, "account.support", "Support")}
          </a>
        </DropdownMenuItem>
        {isAdmin ? (
          <DropdownMenuItem asChild>
            <a href="/admin">
              <ShieldCheck />
              {message(locale, "account.admin", "Admin")}
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun />
            {message(locale, "account.appearance", "Theme")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value) => setTheme(value as ThemePreference)}
            >
              {themeItems.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {message(locale, `account.${value}`, label)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Languages />
            {message(locale, "account.language", "Shell language")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {localeItems.map(({ value, label }) => (
              <DropdownMenuItem key={value} onSelect={() => setLocale(value)}>
                {locale === value ? (
                  <Check />
                ) : (
                  <span className="menu-icon-space" />
                )}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() =>
            void authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  window.location.href = "/";
                },
              },
            })
          }
        >
          <LogOut />
          {message(locale, "account.sign-out", "Sign out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
