import { useEffect, useState } from "react";
import { MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import { ProductShell } from "@/components/product-shell";
import { AdminHealth } from "@/components/admin-health";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AdminUsers } from "@/components/admin-users";
import { Button } from "@/components/ui/button";
import { adminCapabilityCatalog, adminModules } from "@/lib/admin-modules";
import { authClient } from "@/lib/auth-client";

type Ticket = {
  id: string;
  created_by_user_id: string | null;
  contact_email: string;
  kind: string;
  subject: string;
  body: string;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  updated_at: string;
};
type SupportMessage = {
  id: string;
  author_user_id: string | null;
  author_role: string;
  visibility: "public" | "internal";
  body: string;
  created_at: string;
};
type TicketThread = {
  ticket: Ticket;
  messages: SupportMessage[];
  attachments: Array<{
    id: string;
    file_name: string;
    status: string;
  }>;
};
type UserRow = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  banned?: boolean | null;
};
type Overview = {
  users: number;
  openTickets: number;
  notifications24h: number;
  auditEvents24h: number;
  database: string;
};
type AuditEvent = {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
type AuditFilters = {
  search: string;
  action: string;
  targetType: string;
  actorUserId: string;
};
type AuditResult = {
  events: AuditEvent[];
  nextCursor: string | null;
};
type Announcement = {
  id: string;
  title: string;
  body: string;
  deep_link: string;
  created_by_user_id: string | null;
  created_at: string;
};

const emptyAuditFilters: AuditFilters = {
  search: "",
  action: "",
  targetType: "",
  actorUserId: "",
};

export function AdminPage() {
  const { data: session, isPending } = authClient.useSession();
  const activeModule = adminModules.find(({ path }) => path === window.location.pathname)?.id || "overview";
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditFilters, setAuditFilters] =
    useState<AuditFilters>(emptyAuditFilters);
  const [auditDraft, setAuditDraft] =
    useState<AuditFilters>(emptyAuditFilters);
  const [auditNextCursor, setAuditNextCursor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementBody, setAnnouncementBody] = useState("");
  const [announcementDeepLink, setAnnouncementDeepLink] = useState(
    "/app/notifications",
  );
  const [selectedTicketId, setSelectedTicketId] = useState("");
  const [thread, setThread] = useState<TicketThread | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const role = String(
    session?.user && "role" in session.user ? session.user.role || "" : "",
  );
  const admin = role.split(",").includes("admin");

  const requestAudit = async (
    filters: AuditFilters,
    cursor?: string | null,
  ) => {
    const query = new URLSearchParams({ limit: "50" });
    for (const [key, value] of Object.entries(filters))
      if (value.trim()) query.set(key, value.trim());
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`/api/admin/audit?${query.toString()}`, {
      credentials: "include",
    });
    const payload = (await response.json()) as {
      data?: AuditResult;
      error?: { message?: string };
    };
    if (!response.ok || !payload.data)
      throw new Error(
        payload.error?.message || "Unable to load audit events.",
      );
    return payload.data;
  };

  const loadOverview = async () => {
    const response = await fetch("/api/admin/overview", { credentials: "include" });
    const payload = (await response.json()) as { data?: Overview; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Unable to load Admin overview.");
    setOverview(payload.data || null);
  };

  const loadSupport = async () => {
    const [ticketsResponse, usersResult] = await Promise.all([
      fetch("/api/admin/support/tickets", { credentials: "include" }),
      authClient.admin.listUsers({ query: { limit: 50, sortBy: "createdAt", sortDirection: "desc" } }),
    ]);
    const payload = (await ticketsResponse.json()) as { data?: Ticket[]; error?: { message?: string } };
    if (!ticketsResponse.ok) throw new Error(payload.error?.message || "Unable to load Admin inbox.");
    if (usersResult.error) throw new Error(usersResult.error.message || "Unable to load users.");
    setTickets(payload.data || []);
    setUsers((usersResult.data?.users || []) as UserRow[]);
  };

  const loadAnnouncements = async () => {
    const response = await fetch("/api/admin/announcements", { credentials: "include" });
    const payload = (await response.json()) as { data?: Announcement[]; error?: { message?: string } };
    if (!response.ok) throw new Error(payload.error?.message || "Unable to load announcements.");
    setAnnouncements(payload.data || []);
  };

  const loadActiveModule = async () => {
    setError("");
    try {
      if (activeModule === "overview") await loadOverview();
      else if (activeModule === "support") await loadSupport();
      else if (activeModule === "notifications") await loadAnnouncements();
      else if (activeModule === "audit") {
        const result = await requestAudit(auditFilters);
        setAudit(result.events);
        setAuditNextCursor(result.nextCursor);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const applyAuditFilters = async (filters: AuditFilters) => {
    setAuditLoading(true);
    setError("");
    try {
      const result = await requestAudit(filters);
      setAuditFilters(filters);
      setAudit(result.events);
      setAuditNextCursor(result.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAuditLoading(false);
    }
  };

  const loadOlderAudit = async () => {
    if (!auditNextCursor || auditLoading) return;
    setAuditLoading(true);
    setError("");
    try {
      const result = await requestAudit(auditFilters, auditNextCursor);
      setAudit((current) => [...current, ...result.events]);
      setAuditNextCursor(result.nextCursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setAuditLoading(false);
    }
  };

  const loadThread = async (ticketId: string) => {
    const response = await fetch(
      `/api/admin/support/tickets/${encodeURIComponent(ticketId)}`,
      { credentials: "include" },
    );
    const payload = (await response.json()) as {
      data?: TicketThread;
      error?: { message?: string };
    };
    if (!response.ok)
      throw new Error(
        payload.error?.message || "Unable to load ticket thread.",
      );
    setThread(payload.data || null);
  };

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent("/admin")}`,
      );
    else if (!isPending && admin) void loadActiveModule();
  }, [activeModule, admin, isPending, session?.user?.id]);

  useEffect(() => {
    if (selectedTicketId)
      void loadThread(selectedTicketId).catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
    else setThread(null);
  }, [selectedTicketId]);

  const updateTicket = async (
    ticket: Ticket,
    next: Partial<Pick<Ticket, "status" | "priority" | "assigned_to_user_id">>,
  ) => {
    const response = await fetch(
      `/api/admin/support/tickets/${encodeURIComponent(ticket.id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next.status || ticket.status,
          priority: next.priority || ticket.priority,
          assignedToUserId:
            next.assigned_to_user_id === undefined
              ? ticket.assigned_to_user_id
              : next.assigned_to_user_id,
        }),
      },
    );
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    if (!response.ok) {
      setError(payload.error?.message || "Unable to update ticket.");
      return;
    }
    await Promise.all([
      loadSupport(),
      selectedTicketId ? loadThread(selectedTicketId) : Promise.resolve(),
    ]);
  };

  const sendMessage = async () => {
    if (!selectedTicketId || !reply.trim()) return;
    const response = await fetch(
      `/api/admin/support/tickets/${encodeURIComponent(selectedTicketId)}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: reply,
          visibility: internal ? "internal" : "public",
        }),
      },
    );
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    if (!response.ok) {
      setError(payload.error?.message || "Unable to send support message.");
      return;
    }
    setReply("");
    await Promise.all([loadSupport(), loadThread(selectedTicketId)]);
  };

  const publishAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementBody.trim()) return;
    setError("");
    const response = await fetch("/api/admin/announcements", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: announcementTitle,
        body: announcementBody,
        deepLink: announcementDeepLink,
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string };
    };
    if (!response.ok) {
      setError(payload.error?.message || "Unable to publish announcement.");
      return;
    }
    setAnnouncementTitle("");
    setAnnouncementBody("");
    setAnnouncementDeepLink("/app/notifications");
    await loadAnnouncements();
  };

  if (isPending || !session?.user)
    return (
      <main className="protected-loading">
        <span />
        <span />
        <span />
      </main>
    );
  if (!admin)
    return (
      <main className="admin-denied">
        <ShieldCheck size={28} />
        <h1>Admin access required</h1>
        <p>
          This area is separate from organization roles and requires the Better
          Auth platform admin role.
        </p>
        <a href="/app">Return to workspace</a>
      </main>
    );

  const currentModule = adminModules.find(({ id }) => id === activeModule)!;
  return (
    <ProductShell activePath="/admin">
      <main className="operations-main admin-workspace">
        <section className="operations-intro admin-intro">
          <div>
            <span>Product operations</span>
            <h1>Admin</h1>
            <p>
              Manage platform access, customer communication, external analytics
              and operational evidence from one controlled workspace.
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadActiveModule()}>
            <RefreshCw size={15} /> Refresh
          </Button>
        </section>
        {error ? <p className="operations-error">{error}</p> : null}
        <div className="admin-layout">
          <nav className="operations-card admin-module-nav" aria-label="Admin modules">
            {["Workspace", "People", "Engage", "Operate"].map((group) => (
              <div className="admin-nav-group" key={group}>
                <span>{group}</span>
                {adminModules.filter((module) => module.group === group).map((module) => (
                  <a key={module.id} href={module.path} aria-current={activeModule === module.id ? "page" : undefined}>
                    <strong>{module.label}</strong>
                  </a>
                ))}
              </div>
            ))}
          </nav>
          <section className="admin-module-content">
            <header className="operations-card admin-module-header">
              <div>
                <span>{currentModule.group}</span>
                <h2>{currentModule.label}</h2>
                <p>{currentModule.description}</p>
              </div>
              <span className={`status ${currentModule.status}`}>
                {currentModule.status}
              </span>
            </header>

            {activeModule === "overview" && overview ? (
              <div className="admin-metrics">
                {[
                  ["Users", overview.users],
                  ["Open tickets", overview.openTickets],
                  ["Notifications · 24h", overview.notifications24h],
                  ["Audit events · 24h", overview.auditEvents24h],
                ].map(([label, value]) => (
                  <article className="operations-card" key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>
            ) : null}

            {activeModule === "users" ? (
              <AdminUsers currentUserId={session.user.id} />
            ) : null}

            {activeModule === "support" ? (
              <div className="admin-support-grid">
                <section className="operations-card admin-list">
                  <div>
                    <h2>Support inbox</h2>
                    <span>{tickets.length}</span>
                  </div>
                  {tickets.map((ticket) => (
                    <button
                      type="button"
                      className={
                        selectedTicketId === ticket.id
                          ? "admin-ticket selected"
                          : "admin-ticket"
                      }
                      key={ticket.id}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <span className={`ticket-kind ${ticket.kind}`}>
                        {ticket.kind}
                      </span>
                      <span>
                        <strong>{ticket.subject}</strong>
                        <small>{ticket.contact_email}</small>
                      </span>
                      <span className={`status ${ticket.status}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </button>
                  ))}
                </section>
                {thread ? (
                  <section className="operations-card admin-thread">
                    <header>
                      <h3>{thread.ticket.subject}</h3>
                      <p>{thread.ticket.body}</p>
                    </header>
                    <div className="admin-ticket-controls">
                      <select
                        aria-label="Status"
                        value={thread.ticket.status}
                        onChange={(event) =>
                          void updateTicket(thread.ticket, {
                            status: event.target.value,
                          })
                        }
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <select
                        aria-label="Priority"
                        value={thread.ticket.priority}
                        onChange={(event) =>
                          void updateTicket(thread.ticket, {
                            priority: event.target.value,
                          })
                        }
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                      <select
                        aria-label="Assignee"
                        value={thread.ticket.assigned_to_user_id || ""}
                        onChange={(event) =>
                          void updateTicket(thread.ticket, {
                            assigned_to_user_id: event.target.value || null,
                          })
                        }
                      >
                        <option value="">Unassigned</option>
                        {users
                          .filter((user) =>
                            String(user.role || "")
                              .split(",")
                              .includes("admin"),
                          )
                          .map((user) => (
                            <option value={user.id} key={user.id}>
                              {user.name || user.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="thread-messages">
                      {thread.messages.map((message) => (
                        <article
                          className={`thread-message ${message.visibility}`}
                          key={message.id}
                        >
                          <div>
                            <strong>
                              {message.visibility === "internal"
                                ? "Internal note"
                                : message.author_role}
                            </strong>
                            <small>
                              {new Date(message.created_at).toLocaleString()}
                            </small>
                          </div>
                          <p>{message.body}</p>
                        </article>
                      ))}
                    </div>
                    <div className="admin-reply">
                      <label>
                        <span>
                          {internal ? "Internal note" : "Customer reply"}
                        </span>
                        <textarea
                          value={reply}
                          maxLength={5000}
                          onChange={(event) => setReply(event.target.value)}
                        />
                      </label>
                      <label className="admin-note-toggle">
                        <input
                          type="checkbox"
                          checked={internal}
                          onChange={(event) =>
                            setInternal(event.target.checked)
                          }
                        />
                        Keep this message internal
                      </label>
                      <Button onClick={() => void sendMessage()}>
                        <MessageSquare size={15} /> Send
                      </Button>
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {activeModule === "notifications" ? (
              <div className="admin-announcement-grid">
                <section className="operations-card announcement-form">
                  <div>
                    <h2>Publish announcement</h2>
                    <span>Verified active users</span>
                  </div>
                  <label>
                    <span>Title</span>
                    <input
                      value={announcementTitle}
                      minLength={3}
                      maxLength={160}
                      onChange={(event) =>
                        setAnnouncementTitle(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Message</span>
                    <textarea
                      value={announcementBody}
                      minLength={10}
                      maxLength={2000}
                      onChange={(event) =>
                        setAnnouncementBody(event.target.value)
                      }
                    />
                  </label>
                  <label>
                    <span>Deep link</span>
                    <input
                      value={announcementDeepLink}
                      maxLength={500}
                      onChange={(event) =>
                        setAnnouncementDeepLink(event.target.value)
                      }
                    />
                  </label>
                  <Button
                    disabled={
                      announcementTitle.trim().length < 3 ||
                      announcementBody.trim().length < 10
                    }
                    onClick={() => void publishAnnouncement()}
                  >
                    Publish announcement
                  </Button>
                </section>
                <section className="operations-card admin-list announcement-list">
                  <div>
                    <h2>Announcement history</h2>
                    <span>{announcements.length}</span>
                  </div>
                  {announcements.length ? (
                    announcements.map((announcement) => (
                      <article key={announcement.id}>
                        <div>
                          <h3>{announcement.title}</h3>
                          <p>{announcement.body}</p>
                          <small>
                            {new Date(
                              announcement.created_at,
                            ).toLocaleString()}
                            {" · "}
                            {announcement.deep_link}
                          </small>
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="empty-state">No announcements published.</p>
                  )}
                </section>
              </div>
            ) : null}

            {activeModule === "audit" ? (
              <section className="operations-card admin-list audit-list">
                <div>
                  <h2>Audit events</h2>
                  <span>{audit.length}</span>
                </div>
                <form
                  className="audit-filters"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void applyAuditFilters(auditDraft);
                  }}
                >
                  <label>
                    <span>Search</span>
                    <input
                      value={auditDraft.search}
                      maxLength={120}
                      placeholder="Action or target"
                      onChange={(event) =>
                        setAuditDraft((current) => ({
                          ...current,
                          search: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Action</span>
                    <input
                      value={auditDraft.action}
                      maxLength={120}
                      placeholder="support.ticket.updated"
                      onChange={(event) =>
                        setAuditDraft((current) => ({
                          ...current,
                          action: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Target type</span>
                    <input
                      value={auditDraft.targetType}
                      maxLength={120}
                      placeholder="support_ticket"
                      onChange={(event) =>
                        setAuditDraft((current) => ({
                          ...current,
                          targetType: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Actor ID</span>
                    <input
                      value={auditDraft.actorUserId}
                      maxLength={128}
                      placeholder="User ID"
                      onChange={(event) =>
                        setAuditDraft((current) => ({
                          ...current,
                          actorUserId: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <div>
                    <Button type="submit" size="sm" disabled={auditLoading}>
                      {auditLoading ? "Loading…" : "Apply filters"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={auditLoading}
                      onClick={() => {
                        setAuditDraft(emptyAuditFilters);
                        void applyAuditFilters(emptyAuditFilters);
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </form>
                {!audit.length ? (
                  <p className="admin-module-empty">No matching audit events.</p>
                ) : null}
                {audit.map((event) => (
                  <article key={event.id}>
                    <div>
                      <h3>{event.action}</h3>
                      <p>
                        {event.target_type} · {event.target_id}
                      </p>
                      <small>
                        {new Date(event.created_at).toLocaleString()}
                      </small>
                    </div>
                    <code>{JSON.stringify(event.metadata)}</code>
                  </article>
                ))}
                {auditNextCursor ? (
                  <Button
                    className="audit-load-more"
                    variant="outline"
                    disabled={auditLoading}
                    onClick={() => void loadOlderAudit()}
                  >
                    {auditLoading ? "Loading…" : "Load older events"}
                  </Button>
                ) : null}
              </section>
            ) : null}

            {activeModule === "health" ? <AdminHealth /> : null}

            {activeModule === "analytics" ? <AdminAnalytics /> : null}

            {activeModule === "overview" ? (
              <section className="operations-card admin-capability-catalog">
                <header><span>Extend when needed</span><h2>Capability catalog</h2><p>Optional product capabilities stay out of navigation until their Pack is selected.</p></header>
                <div>{adminCapabilityCatalog.map((item) => <article key={item.pack}><strong>{item.label}</strong><p>{item.description}</p><code>{item.pack}</code></article>)}</div>
              </section>
            ) : null}
          </section>
        </div>
      </main>
    </ProductShell>
  );
}
