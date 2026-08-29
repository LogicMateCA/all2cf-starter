import { useEffect, useState, type FormEvent } from "react";
import { Bug, LifeBuoy, MessageSquare, Send } from "lucide-react";
import { ProductShell } from "@/components/product-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type Ticket = {
  id: string;
  kind: "support" | "bug";
  subject: string;
  body: string;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  created_at: string;
  updated_at: string;
};
type Message = {
  id: string;
  author_role: "customer" | "admin" | "system";
  visibility: "public";
  body: string;
  created_at: string;
};
type TicketThread = { ticket: Ticket; messages: Message[] };

export function SupportPage() {
  const { data: session, isPending } = authClient.useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState(
    () => new URLSearchParams(window.location.search).get("ticket") || "",
  );
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [kind, setKind] = useState<"support" | "bug">("support");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [error, setError] = useState("");

  const loadTickets = async () => {
    const response = await fetch("/api/support/tickets", {
      credentials: "include",
    });
    const payload = (await response.json()) as {
      data?: Ticket[];
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message || "Unable to load tickets.");
    const next = payload.data || [];
    setTickets(next);
    if (selectedId && !next.some(({ id }) => id === selectedId))
      setSelectedId("");
  };

  const loadThread = async (ticketId: string) => {
    const response = await fetch(
      `/api/support/tickets/${encodeURIComponent(ticketId)}`,
      { credentials: "include" },
    );
    const payload = (await response.json()) as {
      data?: TicketThread;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(payload.error?.message || "Unable to load ticket.");
    setThread(payload.data || null);
  };

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent("/support")}`,
      );
    if (session?.user)
      void loadTickets().catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [isPending, session?.user?.id]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      return;
    }
    window.history.replaceState(null, "", `/support?ticket=${selectedId}`);
    void loadThread(selectedId).catch((cause) =>
      setError(cause instanceof Error ? cause.message : String(cause)),
    );
  }, [selectedId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, subject, body }),
      });
      const payload = (await response.json()) as {
        data?: Ticket;
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(payload.error?.message || "Unable to create ticket.");
      setSubject("");
      setBody("");
      await loadTickets();
      if (payload.data) setSelectedId(payload.data.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setState("idle");
    }
  };

  const submitReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    setState("sending");
    setError("");
    try {
      const response = await fetch(
        `/api/support/tickets/${encodeURIComponent(selectedId)}/messages`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply }),
        },
      );
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok)
        throw new Error(payload.error?.message || "Unable to send reply.");
      setReply("");
      await Promise.all([loadTickets(), loadThread(selectedId)]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setState("idle");
    }
  };

  if (isPending || !session?.user)
    return (
      <main className="protected-loading">
        <span />
        <span />
        <span />
      </main>
    );
  return (
    <ProductShell activePath="/support">
      <main className="operations-main">
        <section className="operations-intro">
          <span>Product support</span>
          <h1>How can we help?</h1>
          <p>
            Submit a focused support request or bug report, then continue the
            conversation in one lightweight thread.
          </p>
        </section>
        {error ? <p className="operations-error">{error}</p> : null}
        <div className="operations-grid">
          <form className="operations-card ticket-form" onSubmit={submit}>
            <div className="kind-picker">
              <button
                type="button"
                aria-pressed={kind === "support"}
                onClick={() => setKind("support")}
              >
                <LifeBuoy size={17} /> Support
              </button>
              <button
                type="button"
                aria-pressed={kind === "bug"}
                onClick={() => setKind("bug")}
              >
                <Bug size={17} /> Bug
              </button>
            </div>
            <label>
              <span>Subject</span>
              <Input
                value={subject}
                minLength={3}
                maxLength={160}
                required
                onChange={(event) => setSubject(event.target.value)}
              />
            </label>
            <label>
              <span>Description</span>
              <textarea
                value={body}
                minLength={10}
                maxLength={5000}
                required
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <Button disabled={state === "sending"}>
              <Send size={15} />
              {state === "sending" ? "Submitting" : "Submit ticket"}
            </Button>
          </form>
          <section className="operations-card ticket-list">
            <div>
              <h2>Your tickets</h2>
              <span>{tickets.length}</span>
            </div>
            {tickets.length ? (
              tickets.map((ticket) => (
                <button
                  type="button"
                  className={
                    selectedId === ticket.id
                      ? "ticket-row selected"
                      : "ticket-row"
                  }
                  key={ticket.id}
                  onClick={() => setSelectedId(ticket.id)}
                >
                  <span className={`ticket-kind ${ticket.kind}`}>
                    {ticket.kind}
                  </span>
                  <span>
                    <strong>{ticket.subject}</strong>
                    <small>
                      {new Date(ticket.updated_at).toLocaleString()}
                    </small>
                  </span>
                  <span className={`status ${ticket.status}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                </button>
              ))
            ) : (
              <p className="empty-state">No tickets yet.</p>
            )}
          </section>
        </div>
        {thread ? (
          <section className="operations-card support-thread">
            <header>
              <div>
                <span className={`ticket-kind ${thread.ticket.kind}`}>
                  {thread.ticket.kind}
                </span>
                <h2>{thread.ticket.subject}</h2>
                <p>{thread.ticket.body}</p>
              </div>
              <span className={`status ${thread.ticket.status}`}>
                {thread.ticket.status.replace("_", " ")} ·{" "}
                {thread.ticket.priority}
              </span>
            </header>
            <div className="thread-messages">
              {thread.messages.length ? (
                thread.messages.map((message) => (
                  <article
                    className={`thread-message ${message.author_role}`}
                    key={message.id}
                  >
                    <div>
                      <strong>
                        {message.author_role === "admin" ? "Support" : "You"}
                      </strong>
                      <small>
                        {new Date(message.created_at).toLocaleString()}
                      </small>
                    </div>
                    <p>{message.body}</p>
                  </article>
                ))
              ) : (
                <p className="empty-state">No replies yet.</p>
              )}
            </div>
            {thread.ticket.status !== "closed" ? (
              <form className="thread-reply" onSubmit={submitReply}>
                <label>
                  <span>Reply</span>
                  <textarea
                    value={reply}
                    maxLength={5000}
                    required
                    onChange={(event) => setReply(event.target.value)}
                  />
                </label>
                <Button disabled={state === "sending"}>
                  <MessageSquare size={15} /> Send reply
                </Button>
              </form>
            ) : null}
          </section>
        ) : null}
      </main>
    </ProductShell>
  );
}
