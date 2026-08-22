import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, KeyRound, Laptop, Link2, RefreshCw, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { message as i18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { capabilityRoutes } from "@/generated/capability-routes";

type SessionRow = { id: string; token: string; createdAt: Date | string; expiresAt: Date | string; ipAddress?: string | null; userAgent?: string | null };
type AccountRow = { id: string; providerId: string; createdAt: Date | string };

function deviceLabel(userAgent?: string | null) {
  if (!userAgent) return "Unknown device";
  if (/iphone|ipad/iu.test(userAgent)) return "Apple mobile device";
  if (/android/iu.test(userAgent)) return "Android device";
  if (/windows/iu.test(userAgent)) return "Windows browser";
  if (/mac os|macintosh/iu.test(userAgent)) return "Mac browser";
  return "Web browser";
}

export function AccountSettings() {
  const { data: session } = authClient.useSession();
  const { theme, locale, setTheme, setLocale } = usePreferences();
  const [name, setName] = useState(session?.user.name || "");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadSecurity = async () => {
    setError("");
    const [sessionResult, accountResult] = await Promise.all([authClient.listSessions(), authClient.listAccounts()]);
    if (sessionResult.error) throw new Error(sessionResult.error.message || "Unable to load active sessions.");
    if (accountResult.error) throw new Error(accountResult.error.message || "Unable to load linked accounts.");
    setSessions((sessionResult.data || []) as SessionRow[]);
    setAccounts((accountResult.data || []) as AccountRow[]);
  };

  useEffect(() => { void loadSecurity().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))); }, [session?.user.id]);

  const updateProfile = async (event: FormEvent) => {
    event.preventDefault();
    setBusy("profile"); setError(""); setMessage("");
    const result = await authClient.updateUser({ name: name.trim() });
    if (result.error) setError(result.error.message || "Unable to update profile.");
    else setMessage("Profile updated.");
    setBusy("");
  };

  const resendVerification = async () => {
    if (!session?.user.email) return;
    setBusy("verification"); setError(""); setMessage("");
    const result = await authClient.sendVerificationEmail({ email: session.user.email, callbackURL: "/app/settings" });
    if (result.error) setError(result.error.message || "Unable to send verification email.");
    else setMessage("Verification email queued.");
    setBusy("");
  };

  const revoke = async (token: string) => {
    setBusy(token); setError(""); setMessage("");
    const result = await authClient.revokeSession({ token });
    if (result.error) setError(result.error.message || "Unable to revoke this session.");
    else { setMessage("Session revoked."); await loadSecurity(); }
    setBusy("");
  };

  const revokeOthers = async () => {
    setBusy("others"); setError(""); setMessage("");
    const result = await authClient.revokeOtherSessions();
    if (result.error) setError(result.error.message || "Unable to revoke other sessions.");
    else { setMessage("Other sessions revoked."); await loadSecurity(); }
    setBusy("");
  };

  if (!session?.user) return null;
  const currentToken = session.session.token;
  const twoFactorSelected = capabilityRoutes.some(
    ({ path }) => path === "/app/security/two-factor",
  );
  return <main className="product-main account-settings">
    <header className="account-settings-header"><div><span>Account</span><h1>Settings and security</h1><p>Profile, preferences, connected identity methods and active sessions.</p></div><Button variant="outline" onClick={() => void loadSecurity()}><RefreshCw size={15} />Refresh</Button></header>
    {error ? <p className="operations-error" role="alert">{error}</p> : null}
    {message ? <p className="settings-success" role="status"><CheckCircle2 size={15} />{message}</p> : null}
    <section className="settings-panel" aria-labelledby="profile-heading"><div className="settings-panel-heading"><UserRound /><div><h2 id="profile-heading">Profile</h2><p>The name shown in your account menu and product surfaces.</p></div></div><form className="profile-form" onSubmit={updateProfile}><label><span>Name</span><Input value={name} minLength={1} maxLength={120} required onChange={(event) => setName(event.target.value)} /></label><label><span>Email</span><Input value={session.user.email} readOnly aria-describedby="email-state" /></label><div id="email-state" className={session.user.emailVerified ? "identity-state verified" : "identity-state unverified"}>{session.user.emailVerified ? <><CheckCircle2 />Verified email</> : <><XCircle />Email verification required <Button type="button" variant="outline" size="sm" disabled={busy === "verification"} onClick={() => void resendVerification()}>{busy === "verification" ? "Sending" : "Send again"}</Button></>}</div><Button disabled={busy === "profile"}>{busy === "profile" ? "Saving" : "Save profile"}</Button></form></section>
    <section className="settings-panel" aria-labelledby="preferences-heading"><div className="settings-panel-heading"><Laptop /><div><h2 id="preferences-heading">{i18n(locale, "settings.preferences", "Preferences")}</h2><p>{i18n(locale, "settings.preferences-note", "Stored per account and reused by the shared Product Shell.")}</p></div></div><div className="settings-row"><div><strong>{i18n(locale, "settings.appearance", "Appearance")}</strong><p>{i18n(locale, "settings.appearance-note", "System, light, or dark.")}</p></div><div className="segmented-control" role="group" aria-label="Theme">{(["system", "light", "dark"] as const).map((value) => <button key={value} aria-pressed={theme === value} onClick={() => setTheme(value)}>{i18n(locale, `account.${value}`, value)}</button>)}</div></div><div className="settings-row"><div><strong>{i18n(locale, "settings.language", "Shell language")}</strong><p>{i18n(locale, "settings.language-note", "Translates global navigation and account UI; product modules register their own translations.")}</p></div><div className="segmented-control" role="group" aria-label="Shell language"><button aria-pressed={locale === "en"} onClick={() => setLocale("en")}>English</button><button aria-pressed={locale === "zh"} onClick={() => setLocale("zh")}>简体中文</button></div></div></section>
    <section className="settings-panel" aria-labelledby="identity-heading"><div className="settings-panel-heading"><Link2 /><div><h2 id="identity-heading">Linked identity methods</h2><p>Better Auth remains authoritative for linked providers.</p></div></div><div className="identity-list">{accounts.length ? accounts.map((account) => <article key={account.id}><span><strong>{account.providerId === "credential" ? "Email and password" : account.providerId}</strong><small>Connected {new Date(account.createdAt).toLocaleDateString()}</small></span><span className="status implemented">connected</span></article>) : <p className="empty-state">No linked identity methods were returned.</p>}</div></section>
    <section className="settings-panel" aria-labelledby="sessions-heading"><div className="settings-panel-heading"><ShieldCheck /><div><h2 id="sessions-heading">Active sessions</h2><p>Revoke any session you no longer recognize.</p></div></div><div className="session-toolbar"><span>{sessions.length} active</span><Button variant="outline" size="sm" disabled={busy === "others" || sessions.length < 2} onClick={() => void revokeOthers()}>{busy === "others" ? "Revoking" : "Revoke other sessions"}</Button></div><div className="session-list">{sessions.map((item) => { const current = item.token === currentToken; return <article key={item.id}><Laptop /><span><strong>{deviceLabel(item.userAgent)}{current ? " · current" : ""}</strong><small>{item.ipAddress || "IP unavailable"} · expires {new Date(item.expiresAt).toLocaleString()}</small></span>{current ? <span className="status active">current</span> : <Button variant="outline" size="sm" disabled={busy === item.token} onClick={() => void revoke(item.token)}>{busy === item.token ? "Revoking" : "Revoke"}</Button>}</article>; })}</div></section>
    <section className="settings-panel security-capabilities" aria-labelledby="advanced-heading"><div className="settings-panel-heading"><KeyRound /><div><h2 id="advanced-heading">Advanced sign-in</h2><p>Capabilities appear only when their official Better Auth plugin and schema pack are selected.</p></div></div><div className="capability-state"><span><strong>Passkeys</strong><small>Official plugin not selected in this Blueprint.</small></span><span className="status available">unavailable</span></div><div className="capability-state"><span><strong>Two-factor authentication</strong><small>{twoFactorSelected ? "TOTP, recovery codes, trusted devices, and lockout are available." : "Official plugin not selected in this Blueprint."}</small></span>{twoFactorSelected ? <Button asChild variant="outline" size="sm"><a href="/app/security/two-factor">Manage 2FA</a></Button> : <span className="status available">unavailable</span>}</div></section>
  </main>;
}
