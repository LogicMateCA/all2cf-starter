import { FormEvent, useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import "./organization-page.css";

type OrganizationSummary = { id: string; name: string; slug: string; logo?: string | null };

export function OrganizationPage() {
  const { data: session, isPending } = authClient.useSession();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function refresh() {
    const result = await authClient.organization.list();
    if (result.error) setMessage(result.error.message || "Organizations could not be loaded.");
    else setOrganizations(result.data || []);
  }

  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
    if (session?.user) void refresh();
  }, [isPending, session?.user?.id]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const result = await authClient.organization.create({ name: name.trim(), slug: slug.trim().toLowerCase() });
    if (result.error) return setMessage(result.error.message || "Organization could not be created.");
    setName(""); setSlug(""); setActiveId(result.data?.id || null); setMessage("Organization created."); await refresh();
  }

  async function activate(organizationId: string) {
    const result = await authClient.organization.setActive({ organizationId });
    if (result.error) return setMessage(result.error.message || "Organization could not be activated.");
    setActiveId(organizationId); setMessage("Active organization changed.");
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!activeId) return setMessage("Select an active organization first.");
    const result = await authClient.organization.inviteMember({ organizationId: activeId, email: inviteEmail.trim().toLowerCase(), role: "member", resend: true });
    if (result.error) return setMessage(result.error.message || "Invitation could not be sent.");
    setInviteEmail(""); setMessage("Invitation sent through the configured authentication email provider.");
  }

  if (isPending || !session?.user) return <main className="org-loading">Loading workspace…</main>;
  return <main className="org-shell"><header><a href="/app">← Workspace</a><h1>Organizations</h1><p>Create a tenant workspace, choose the active organization, and invite a verified member.</p></header><section><h2>Your organizations</h2>{organizations.length ? <ul>{organizations.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>{item.slug}</small></div><button type="button" aria-pressed={activeId === item.id} onClick={() => void activate(item.id)}>{activeId === item.id ? "Active" : "Use workspace"}</button></li>)}</ul> : <p>No organizations yet.</p>}</section><div className="org-grid"><form onSubmit={create}><h2>Create organization</h2><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Slug<input required pattern="[a-z0-9-]+" value={slug} onChange={(event) => setSlug(event.target.value)} /></label><button type="submit">Create</button></form><form onSubmit={invite}><h2>Invite member</h2><label>Email<input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label><button type="submit" disabled={!activeId}>Send invitation</button></form></div>{message ? <p role="status" className="org-message">{message}</p> : null}</main>;
}

export function OrganizationInvitationPage() {
  const { data: session, isPending } = authClient.useSession();
  const [message, setMessage] = useState("");
  const invitationId = new URLSearchParams(window.location.search).get("id") || "";
  useEffect(() => {
    if (!isPending && !session?.user) window.location.replace(`/login?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
  }, [isPending, session]);
  async function accept() {
    const result = await authClient.organization.acceptInvitation({ invitationId });
    if (result.error) setMessage(result.error.message || "Invitation could not be accepted.");
    else window.location.replace("/app/team");
  }
  if (isPending || !session?.user) return <main className="org-loading">Loading invitation…</main>;
  return <main className="org-invitation"><a href="/app">← Workspace</a><h1>Organization invitation</h1><p>Accepting adds your verified account to this organization. It does not grant platform Admin access.</p><button type="button" disabled={!invitationId} onClick={() => void accept()}>Accept invitation</button>{message ? <p role="alert">{message}</p> : null}</main>;
}
