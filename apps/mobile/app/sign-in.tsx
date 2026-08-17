import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "@tamagui/button";
import { Input } from "@tamagui/input";
import { Label } from "@tamagui/label";
import { Spinner } from "@tamagui/spinner";
import { YStack } from "@tamagui/stacks";
import { H1, Paragraph, SizableText } from "@tamagui/text";
import { authClient } from "../lib/auth-client";
import { apiUrl, appScheme } from "../lib/runtime";

type Step = "email" | "password" | "register" | "password-setup" | "check-email" | "reset" | "complete";
type Lookup = { publicLookupRestricted?: boolean; exists?: boolean; name?: string; hasPassword?: boolean };

export default function SignInScreen() {
  const parameters = useLocalSearchParams<{ token?: string }>();
  const resetToken = typeof parameters.token === "string" ? parameters.token : "";
  const [step, setStep] = useState<Step>(resetToken ? "reset" : "email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function continueWithEmail() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${apiUrl}/api/auth-flow/check-email`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const payload = await response.json() as { data?: Lookup; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to continue.");
      const next = payload.data || {};
      setLookup(next);
      setStep(next.publicLookupRestricted || next.hasPassword ? "password" : next.exists ? "password-setup" : "register");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to continue."); }
    finally { setBusy(false); }
  }

  async function signIn() {
    setBusy(true); setError("");
    const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (result.error) setError("Email or password is incorrect.");
    else router.replace("/");
  }

  async function register() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`${apiUrl}/api/auth-flow/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, password, confirmPassword }) });
      const payload = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to create the account.");
      setStep("check-email");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to create the account."); }
    finally { setBusy(false); }
  }

  async function sendPasswordSetup() {
    setBusy(true); setError("");
    const result = await authClient.requestPasswordReset({ email: email.trim().toLowerCase(), redirectTo: `${appScheme}://sign-in` });
    setBusy(false);
    if (result.error) setError("Unable to send password instructions right now.");
    else setStep("check-email");
  }

  async function signInGoogle() {
    setBusy(true); setError("");
    const result = await authClient.signIn.social({ provider: "google" });
    if (result?.error) { setBusy(false); setError("Google sign-in could not be started."); }
  }

  async function resetPassword() {
    if (password.length < 8 || password !== confirmPassword) { setError(password !== confirmPassword ? "Passwords do not match." : "Use at least 8 characters."); return; }
    setBusy(true); setError("");
    const result = await authClient.resetPassword({ newPassword: password, token: resetToken });
    setBusy(false);
    if (result.error) setError("This reset link is invalid or has expired.");
    else setStep("complete");
  }

  const reset = () => { setStep("email"); setPassword(""); setConfirmPassword(""); setError(""); };

  return <YStack flex={1} justify="center" gap="$4" p="$6" bg="$background" maxW={480} width="100%" self="center">
    {step !== "email" && step !== "check-email" ? <Button chromeless self="flex-start" p={0} onPress={reset}>Back</Button> : null}
    <YStack gap="$2" mb="$3"><H1>{step === "email" ? "Sign in or create an account" : step === "password" ? `Welcome${lookup?.name ? `, ${lookup.name}` : " back"}` : step === "register" ? "Create your account" : step === "password-setup" ? "Finish account setup" : step === "reset" ? "Choose a new password" : step === "complete" ? "Password updated" : "Check your email"}</H1><Paragraph color="$color10">{step === "email" ? "Use your work email or continue with Google." : step === "check-email" ? `Instructions were sent to ${email}.` : step === "reset" ? "Use at least 8 characters." : step === "complete" ? "You can now sign in with your new password." : email}</Paragraph></YStack>

    {step === "email" ? <><Field label="Email address"><Input value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" /></Field><Button onPress={() => void continueWithEmail()} disabled={busy || !email.trim()}>{busy ? <Spinner /> : "Continue"}</Button><Button chromeless borderWidth={1} borderColor="$borderColor" onPress={() => void signInGoogle()} disabled={busy}>Continue with Google</Button></> : null}
    {step === "password" ? <><Field label="Password"><Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" /></Field><Button onPress={() => void signIn()} disabled={busy || !password}>{busy ? <Spinner /> : "Sign in"}</Button></> : null}
    {step === "register" ? <><Field label="Name"><Input value={name} onChangeText={setName} autoComplete="name" /></Field><Field label="Password"><Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /></Field><Field label="Confirm password"><Input value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" /></Field><Button onPress={() => void register()} disabled={busy || !name || !password || !confirmPassword}>{busy ? <Spinner /> : "Create account"}</Button></> : null}
    {step === "password-setup" ? <><Paragraph>This email already uses a linked sign-in method.</Paragraph><Button onPress={() => void signInGoogle()} disabled={busy}>Continue with Google</Button><Button chromeless borderWidth={1} borderColor="$borderColor" onPress={() => void sendPasswordSetup()} disabled={busy}>Set a password by email</Button></> : null}
    {step === "check-email" ? <Button chromeless borderWidth={1} borderColor="$borderColor" onPress={reset}>Return to sign in</Button> : null}
    {step === "reset" ? <><Field label="New password"><Input value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /></Field><Field label="Confirm password"><Input value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" /></Field><Button onPress={() => void resetPassword()} disabled={busy || !password || !confirmPassword}>{busy ? <Spinner /> : "Update password"}</Button></> : null}
    {step === "complete" ? <Button onPress={() => { router.setParams({ token: undefined }); reset(); }}>Sign in</Button> : null}
    {error ? <SizableText color="$red10" size="$2" accessibilityRole="alert">{error}</SizableText> : null}
  </YStack>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <YStack gap="$2"><Label>{label}</Label>{children}</YStack>;
}
