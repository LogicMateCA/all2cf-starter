import { useEffect, useState } from "react";
import { CircleDot, RefreshCw, ShieldCheck } from "lucide-react";
import { AccountControl } from "@/components/account-control";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type Ticket = { id: string; contact_email: string; kind: string; subject: string; body: string; status: string; priority: string; updated_at: string };
type UserRow = { id: string; name: string; email: string; role?: string | null; banned?: boolean | null };

export function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState("");
  const role = String(session?.user && "role" in session.user ? session.user.role || "" : "");
  const admin = role.split(",").includes("admin");

  const load = async () => {
    setError("");
    try {
      const [ticketsResponse, usersResult] = await Promise.all([
        fetch("/api/admin/support/tickets", { credentials: "include" }),
        authClient.admin.listUsers({ query: { limit: 20, sortBy: "createdAt", sortDirection: "desc" } }),
      ]);
      const ticketPayload = await ticketsResponse.json() as { data?: Ticket[]; error?: { message?: string } };
      if (!ticketsResponse.ok) throw new Error(ticketPayload.error?.message || "Unable to load Admin inbox.");
      if (usersResult.error) throw new Error(usersResult.error.message || "Unable to load users.");
      setTickets(ticketPayload.data || []);
      setUsers((usersResult.data?.users || []) as UserRow[]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent("/admin")}`);
    else if (!isPending && admin) void load();
  }, [admin, isPending, session?.user?.id]);

  const setStatus = async (ticket: Ticket, status: string) => {
    const response = await fetch(`/api/admin/support/tickets/${encodeURIComponent(ticket.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const payload = await response.json() as { error?: { message?: string } };
    if (!response.ok) { setError(payload.error?.message || "Unable to update ticket."); return; }
    await load();
  };

  if (isPending || !session?.user) return <main className="protected-loading"><span /><span /><span /></main>;
  if (!admin) return <main className="admin-denied"><ShieldCheck size={28} /><h1>Admin access required</h1><p>This area is separate from organization roles and requires the Better Auth platform admin role.</p><a href="/app">Return to workspace</a></main>;
  return <div className="product-shell operations-shell"><header className="product-header"><a className="brand" href="/"><span><CircleDot size={17} /></span><strong>Cloudflare AI Starter</strong></a><nav><a href="/admin" aria-current="page">Admin</a><a href="/support">Support</a></nav><AccountControl compact /></header><main className="operations-main"><section className="operations-intro admin-intro"><div><span>Product operations</span><h1>Admin</h1><p>Identity readback and the lightweight support inbox.</p></div><Button variant="outline" onClick={() => void load()}><RefreshCw size={15} />Refresh</Button></section>{error ? <p className="operations-error">{error}</p> : null}<div className="operations-grid admin-grid"><section className="operations-card admin-list"><div><h2>Support inbox</h2><span>{tickets.length}</span></div>{tickets.map((ticket) => <article key={ticket.id}><div><span className={`ticket-kind ${ticket.kind}`}>{ticket.kind}</span><h3>{ticket.subject}</h3><p>{ticket.body}</p><small>{ticket.contact_email}</small></div><select value={ticket.status} onChange={(event) => void setStatus(ticket, event.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></article>)}</section><section className="operations-card admin-list user-list"><div><h2>Recent users</h2><span>{users.length}</span></div>{users.map((user) => <article key={user.id}><div><h3>{user.name || user.email}</h3><p>{user.email}</p></div><span className={`status ${user.banned ? "failed" : "implemented"}`}>{user.banned ? "banned" : user.role || "user"}</span></article>)}</section></div></main></div>;
}
