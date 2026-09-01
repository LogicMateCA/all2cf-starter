import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "./sso-page.css";
export function SsoSignInPage() { const [email,setEmail]=useState(""); const [busy,setBusy]=useState(false); const [error,setError]=useState(""); async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError("");const result=await authClient.signIn.sso({email:email.trim().toLowerCase(),callbackURL:"/app"});if(result.error){setError("No configured SSO provider matches this email domain.");setBusy(false);}} return <main className="sso-auth"><form onSubmit={(event)=>void submit(event)}><span>Enterprise identity</span><h1>Sign in with SSO</h1><p>Enter your work email. The project selects only a preconfigured OIDC or SAML connection for its verified domain.</p><Input type="email" autoComplete="email" required value={email} onChange={(event)=>setEmail(event.target.value)} placeholder="you@company.com"/><Button type="submit" disabled={busy}>{busy?"Finding provider":"Continue with SSO"}</Button>{error?<p role="alert">{error}</p>:null}</form></main>; }
