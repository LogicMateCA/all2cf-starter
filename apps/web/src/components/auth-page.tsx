import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TurnstileChallenge } from "@/components/turnstile-challenge";

type AuthStep = "email" | "password" | "register" | "password-setup" | "forgot" | "check-email" | "reset" | "complete";
type EmailLookup = { publicLookupRestricted?: boolean; exists?: boolean; name?: string; emailVerified?: boolean; hasPassword?: boolean; linkedProviders?: string[] };
type SocialMethod = { key: "google" | "github" | "apple"; label: string; enabled: boolean };
type AntiAbuse = { provider: "none" | "turnstile"; siteKey: string };

function safeReturnTo() {
  const raw = new URLSearchParams(window.location.search).get("returnTo") || "/app";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/app";
}

function messageFrom(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

export function AuthPage() {
  const query = useMemo(() => new URLSearchParams(window.location.search), []);
  const resetToken = query.get("token") || "";
  const [step, setStep] = useState<AuthStep>(resetToken ? "reset" : "email");
  const [email, setEmail] = useState(query.get("email") || "");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<EmailLookup | null>(null);
  const [socialMethods, setSocialMethods] = useState<SocialMethod[]>([]);
  const [antiAbuse, setAntiAbuse] = useState<AntiAbuse>({ provider: "none", siteKey: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const returnTo = safeReturnTo();

  useEffect(() => {
    void fetch("/api/auth-methods", { headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error("methods unavailable")))
      .then((payload: { methods?: SocialMethod[]; antiAbuse?: AntiAbuse }) => {
        setSocialMethods((payload.methods || []).filter(({ enabled }) => enabled));
        setAntiAbuse(payload.antiAbuse?.provider === "turnstile" && payload.antiAbuse.siteKey ? payload.antiAbuse : { provider: "none", siteKey: "" });
      })
      .catch(() => setSocialMethods([]));
  }, []);

  useEffect(() => setCaptchaToken(""), [step]);

  const resetTransientState = () => { setError(""); setPassword(""); setConfirmPassword(""); };
  const goBack = () => { resetTransientState(); setStep("email"); };

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth-flow/check-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json() as { data?: EmailLookup; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to continue.");
      const next = payload.data || {};
      setLookup(next);
      if (next.publicLookupRestricted || next.hasPassword) setStep("password");
      else if (next.exists) setStep("password-setup");
      else setStep("register");
    } catch (caught) { setError(messageFrom(caught, "Unable to continue.")); }
    finally { setBusy(false); }
  }

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password, callbackURL: returnTo, fetchOptions: antiAbuse.provider === "turnstile" ? { headers: { "x-captcha-response": captchaToken } } : undefined });
    setBusy(false);
    if (result.error?.code === "EMAIL_NOT_VERIFIED") setStep("check-email");
    else if (result.error) setError("Email or password is incorrect.");
    else window.location.assign(returnTo);
  }

  async function register(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth-flow/register", { method: "POST", headers: { "Content-Type": "application/json", ...(antiAbuse.provider === "turnstile" ? { "x-captcha-response": captchaToken } : {}) }, body: JSON.stringify({ email, name, password, confirmPassword }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to create the account.");
      setStep("check-email");
    } catch (caught) { setError(messageFrom(caught, "Unable to create the account.")); }
    finally { setBusy(false); }
  }

  async function sendReset(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true); setError("");
    const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: `${window.location.origin}/login`, fetchOptions: antiAbuse.provider === "turnstile" ? { headers: { "x-captcha-response": captchaToken } } : undefined });
    setBusy(false);
    if (result.error) setError("Unable to send password instructions right now.");
    else setStep("check-email");
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password !== confirmPassword) { setError(password !== confirmPassword ? "Passwords do not match." : "Use at least 8 characters."); return; }
    setBusy(true); setError("");
    const result = await authClient.resetPassword({ newPassword: password, token: resetToken });
    setBusy(false);
    if (result.error) setError("This reset link is invalid or has expired.");
    else { window.history.replaceState({}, "", "/login"); setStep("complete"); }
  }

  async function signInSocial(provider: SocialMethod["key"]) {
    setBusy(true); setError("");
    const result = await authClient.signIn.social({ provider, callbackURL: returnTo });
    if (result?.error) { setBusy(false); setError(`${provider} sign-in could not be started.`); }
  }

  const title = step === "email" ? "Sign in or create an account" : step === "password" ? `Welcome${lookup?.name ? `, ${lookup.name}` : " back"}` : step === "register" ? "Create your account" : step === "password-setup" ? "Finish account setup" : step === "forgot" ? "Reset your password" : step === "reset" ? "Choose a new password" : step === "complete" ? "Password updated" : "Check your email";
  const description = step === "email" ? `Use your work email${socialMethods.length ? " or a configured social provider" : ""}.` : step === "password" ? email : step === "register" ? `Create an account for ${email}.` : step === "password-setup" ? `${email} already uses a linked sign-in method.` : step === "forgot" ? `We will send instructions to ${email}.` : step === "reset" ? "Use at least 8 characters." : step === "complete" ? "You can now sign in with your new password." : `Instructions were sent to ${email}.`;

  return <main className="auth-shell">
    <a className="auth-brand" href="/"><span><ShieldCheck size={18} /></span><strong>Cloudflare AI Starter</strong></a>
    <section className="auth-card" aria-live="polite">
      {step !== "email" && step !== "reset" && step !== "complete" && step !== "check-email" ? <button className="auth-back" onClick={goBack}><ArrowLeft size={16} />Back</button> : null}
      <header className="auth-heading"><h1>{title}</h1><p>{description}</p></header>

      {step === "email" ? <form onSubmit={submitEmail} className="auth-form">
        <div className="field"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus aria-invalid={Boolean(error)} /></div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" disabled={busy || !email.trim()}>{busy ? <Loader2 className="spin" /> : null}Continue</Button>
        {socialMethods.length ? <div className="auth-divider"><span>or</span></div> : null}
        {socialMethods.map((method) => <Button key={method.key} type="button" size="lg" variant="outline" onClick={() => void signInSocial(method.key)} disabled={busy} className="social-provider-button"><span className="google-mark">{method.label.slice(0, 1)}</span>Continue with {method.label}</Button>)}
      </form> : null}

      {step === "password" ? <form onSubmit={signIn} className="auth-form">
        <PasswordField value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} autoFocus />
        {antiAbuse.provider === "turnstile" ? <TurnstileChallenge siteKey={antiAbuse.siteKey} action="credential_sign_in" onToken={setCaptchaToken} onError={setError} /> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" disabled={busy || !password || (antiAbuse.provider === "turnstile" && !captchaToken)}>{busy ? <Loader2 className="spin" /> : null}Sign in</Button>
        <button type="button" className="text-action" onClick={() => { resetTransientState(); setStep("forgot"); }}>Forgot password?</button>
        {lookup?.publicLookupRestricted ? <button type="button" className="text-action secondary" onClick={() => { resetTransientState(); setStep("register"); }}>Create an account</button> : null}
      </form> : null}

      {step === "register" ? <form onSubmit={register} className="auth-form">
        <div className="field"><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></div>
        <PasswordField value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password" />
        <div className="field"><Label htmlFor="confirm-password">Confirm password</Label><Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
        {antiAbuse.provider === "turnstile" ? <TurnstileChallenge siteKey={antiAbuse.siteKey} action="credential_sign_up" onToken={setCaptchaToken} onError={setError} /> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <Button type="submit" size="lg" disabled={busy || !name || !password || !confirmPassword || (antiAbuse.provider === "turnstile" && !captchaToken)}>{busy ? <Loader2 className="spin" /> : null}Create account</Button>
      </form> : null}

      {step === "password-setup" ? <div className="auth-form"><p className="auth-note">Continue with a configured linked provider, or request an email to create a password.</p>{socialMethods.map((method) => <Button key={method.key} size="lg" onClick={() => void signInSocial(method.key)} disabled={busy}>Continue with {method.label}</Button>)}<Button size="lg" variant="outline" onClick={() => void sendReset()} disabled={busy}>Set a password by email</Button></div> : null}
      {step === "forgot" ? <form onSubmit={sendReset} className="auth-form">{antiAbuse.provider === "turnstile" ? <TurnstileChallenge siteKey={antiAbuse.siteKey} action="credential_password_reset" onToken={setCaptchaToken} onError={setError} /> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" size="lg" disabled={busy || (antiAbuse.provider === "turnstile" && !captchaToken)}>{busy ? <Loader2 className="spin" /> : <Mail />}Send reset instructions</Button></form> : null}
      {step === "reset" ? <form onSubmit={resetPassword} className="auth-form"><PasswordField value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} autoComplete="new-password" autoFocus /><div className="field"><Label htmlFor="confirm-reset-password">Confirm password</Label><Input id="confirm-reset-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<Button type="submit" size="lg" disabled={busy}>{busy ? <Loader2 className="spin" /> : null}Update password</Button></form> : null}
      {step === "check-email" ? <div className="auth-result"><span><Mail size={23} /></span><p>The response is intentionally the same whether or not an account exists.</p><Button variant="outline" onClick={goBack}>Return to sign in</Button></div> : null}
      {step === "complete" ? <div className="auth-result"><span><CheckCircle2 size={23} /></span><Button asChild><a href={`/login?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent(returnTo)}`}>Sign in</a></Button></div> : null}
    </section>
    <p className="auth-footer">Protected by secure, host-only sessions.</p>
  </main>;
}

function PasswordField({ value, setValue, show, setShow, autoComplete = "current-password", autoFocus = false }: { value: string; setValue: (value: string) => void; show: boolean; setShow: (show: boolean) => void; autoComplete?: string; autoFocus?: boolean }) {
  return <div className="field"><Label htmlFor="password">Password</Label><div className="password-input"><Input id="password" type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(event) => setValue(event.target.value)} required autoFocus={autoFocus} /><button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>;
}
