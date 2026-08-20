import { useEffect, useState, type FormEvent } from "react";
import { Bug, CircleDot, LifeBuoy, Send } from "lucide-react";
import { AccountControl } from "@/components/account-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Ticket = { id: string; kind: "support" | "bug"; subject: string; body: string; status: string; priority: string; created_at: string; updated_at: string };

export function SupportPage() {
  const { data: session, isPending } = authClient.useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [kind, setKind] = useState<"support" | "bug">("support");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState("");

  const load = () => fetch("/api/support/tickets", { credentials: "include" })
    .then(async (response) => {
      const payload = await response.json() as { data?: Ticket[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to load tickets.");
      setTickets(payload.data || []);
    });

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent("/support")}`);
    if (session?.user) void load().catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [isPending, session?.user?.id]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/support/tickets", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, subject, body }) });
      const payload = await response.json() as { data?: Ticket; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Unable to create ticket.");
      setSubject("");
      setBody("");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setState("idle");
    }
  };

  if (isPending || !session?.user) return <main className="protected-loading"><span /><span /><span /></main>;
  return <div className="product-shell operations-shell">
    <header className="product-header"><a className="brand" href="/"><span><CircleDot size={17} /></span><strong>Cloudflare AI Starter</strong></a><nav><a href="/app">Workspace</a><a href="/support" aria-current="page">Support</a></nav><AccountControl compact /></header>
    <main className="operations-main"><section className="operations-intro"><span>Product support</span><h1>How can we help?</h1><p>Submit a focused support request or bug report and follow its current state.</p></section>
      <div className="operations-grid"><form className="operations-card ticket-form" onSubmit={submit}><div className="kind-picker"><button type="button" aria-pressed={kind === "support"} onClick={() => setKind("support")}><LifeBuoy size={17} />Support</button><button type="button" aria-pressed={kind === "bug"} onClick={() => setKind("bug")}><Bug size={17} />Bug</button></div><label><span>Subject</span><Input value={subject} minLength={3} maxLength={160} required onChange={(event) => setSubject(event.target.value)} /></label><label><span>Description</span><textarea value={body} minLength={10} maxLength={5000} required onChange={(event) => setBody(event.target.value)} /></label>{error ? <p className="operations-error">{error}</p> : null}<Button disabled={state === "sending"}><Send size={15} />{state === "sending" ? "Submitting" : "Submit ticket"}</Button></form>
      <section className="operations-card ticket-list"><div><h2>Your tickets</h2><span>{tickets.length}</span></div>{tickets.length ? tickets.map((ticket) => <article key={ticket.id}><span className={`ticket-kind ${ticket.kind}`}>{ticket.kind}</span><div><h3>{ticket.subject}</h3><p>{ticket.body}</p><small>{new Date(ticket.created_at).toLocaleString()}</small></div><span className={`status ${ticket.status}`}>{ticket.status.replace("_", " ")}</span></article>) : <p className="empty-state">No tickets yet.</p>}</section></div>
    </main>
  </div>;
}
