import { FormEvent, useEffect, useState } from "react";
import { ProductShell } from "../product-shell";
import { authClient } from "../../lib/auth-client";
import "./organization-page.css";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};
type OrganizationMember = {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string; image?: string | null };
};
type OrganizationInvitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string | Date;
};

export function OrganizationPage() {
  const { data: session, isPending } = authClient.useSession();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canManage = activeRole.split(",").some((role) =>
    ["owner", "admin"].includes(role.trim()),
  );

  async function refreshOrganization(organizationId: string | null) {
    if (!organizationId) {
      setMembers([]);
      setInvitations([]);
      setActiveRole("");
      return;
    }
    const [memberResult, roleResult] = await Promise.all([
      authClient.organization.listMembers({
        query: {
          organizationId,
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "asc",
        },
      }),
      authClient.organization.getActiveMemberRole(),
    ]);
    if (memberResult.error || roleResult.error) {
      setMessage(
        memberResult.error?.message ||
          roleResult.error?.message ||
          "Organization members could not be loaded.",
      );
      return;
    }
    const role = roleResult.data?.role || "";
    setMembers((memberResult.data?.members || []) as OrganizationMember[]);
    setActiveRole(role);
    if (role.split(",").some((value) => ["owner", "admin"].includes(value))) {
      const invitationResult = await authClient.organization.listInvitations({
        query: { organizationId },
      });
      if (invitationResult.error)
        setMessage(
          invitationResult.error.message || "Invitations could not be loaded.",
        );
      else
        setInvitations(
          ((invitationResult.data || []) as OrganizationInvitation[]).filter(
            (invitation) => invitation.status === "pending",
          ),
        );
    } else setInvitations([]);
  }

  async function refresh() {
    const [listResult, activeResult] = await Promise.all([
      authClient.organization.list(),
      authClient.organization.getFullOrganization(),
    ]);
    if (listResult.error) {
      setMessage(
        listResult.error.message || "Organizations could not be loaded.",
      );
      return;
    }
    const list = (listResult.data || []) as OrganizationSummary[];
    const active = activeResult.data as OrganizationSummary | null;
    setOrganizations(list);
    setActiveId(active?.id || null);
    await refreshOrganization(active?.id || null);
  }

  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(window.location.pathname)}`,
      );
    if (session?.user) void refresh();
  }, [isPending, session?.user?.id]);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.create({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
    });
    if (result.error)
      setMessage(
        result.error.message || "Organization could not be created.",
      );
    else {
      setName("");
      setSlug("");
      setMessage("Organization created and selected.");
      await activate(result.data?.id || "");
      await refresh();
    }
    setBusy(false);
  }

  async function activate(organizationId: string) {
    if (!organizationId) return;
    setMessage("");
    const result = await authClient.organization.setActive({ organizationId });
    if (result.error)
      setMessage(
        result.error.message || "Organization could not be activated.",
      );
    else {
      setActiveId(organizationId);
      setMessage("Active organization changed.");
      await refreshOrganization(organizationId);
    }
  }

  async function invite(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !canManage)
      return setMessage("Select a manageable organization first.");
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.inviteMember({
      organizationId: activeId,
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
      resend: true,
    });
    if (result.error)
      setMessage(result.error.message || "Invitation could not be sent.");
    else {
      setInviteEmail("");
      setMessage(
        "Invitation sent through the configured authentication email provider.",
      );
      await refreshOrganization(activeId);
    }
    setBusy(false);
  }

  async function updateRole(
    member: OrganizationMember,
    role: "member" | "admin",
  ) {
    if (!activeId || member.role.includes("owner")) return;
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.updateMemberRole({
      organizationId: activeId,
      memberId: member.id,
      role,
    });
    if (result.error)
      setMessage(result.error.message || "Member role could not be changed.");
    else {
      setMessage("Member role changed.");
      await refreshOrganization(activeId);
    }
    setBusy(false);
  }

  async function removeMember(member: OrganizationMember) {
    if (!activeId || member.role.includes("owner")) return;
    if (confirmRemoveId !== member.id) {
      setConfirmRemoveId(member.id);
      setMessage("Select Confirm remove to remove this member.");
      return;
    }
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.removeMember({
      organizationId: activeId,
      memberIdOrEmail: member.id,
    });
    if (result.error)
      setMessage(result.error.message || "Member could not be removed.");
    else {
      setConfirmRemoveId("");
      setMessage("Member removed.");
      await refreshOrganization(activeId);
    }
    setBusy(false);
  }

  async function cancelInvitation(invitationId: string) {
    if (!activeId || !canManage) return;
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.cancelInvitation({
      invitationId,
    });
    if (result.error)
      setMessage(result.error.message || "Invitation could not be cancelled.");
    else {
      setMessage("Invitation cancelled.");
      await refreshOrganization(activeId);
    }
    setBusy(false);
  }

  if (isPending || !session?.user)
    return <main className="org-loading">Loading workspace…</main>;
  return (
    <ProductShell activePath="/app/team">
      <main className="org-shell">
        <header>
          <span>Team SaaS</span>
          <h1>Organizations</h1>
          <p>
            Create tenant workspaces, switch active context, manage members,
            and deliver verified invitations through the configured email
            provider.
          </p>
        </header>
        <section>
          <h2>Your organizations</h2>
          {organizations.length ? (
            <ul>
              {organizations.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.slug}</small>
                  </div>
                  <button
                    type="button"
                    aria-pressed={activeId === item.id}
                    onClick={() => void activate(item.id)}
                  >
                    {activeId === item.id ? "Active" : "Use workspace"}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No organizations yet.</p>
          )}
        </section>
        <div className="org-grid">
          <form onSubmit={create}>
            <h2>Create organization</h2>
            <label>
              Name
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9-]+"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy}>
              Create
            </button>
          </form>
          <form onSubmit={invite}>
            <h2>Invite member</h2>
            <label>
              Email
              <input
                required
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </label>
            <label>
              Role
              <select
                value={inviteRole}
                onChange={(event) =>
                  setInviteRole(event.target.value as "member" | "admin")
                }
              >
                <option value="member">Member</option>
                <option value="admin">Organization admin</option>
              </select>
            </label>
            <button type="submit" disabled={!activeId || !canManage || busy}>
              Send invitation
            </button>
          </form>
        </div>
        {activeId ? (
          <section>
            <div className="org-section-title">
              <div>
                <h2>Members</h2>
                <small>Your role: {activeRole || "member"}</small>
              </div>
              <span>{members.length}</span>
            </div>
            <ul>
              {members.map((member) => (
                <li key={member.id}>
                  <div>
                    <strong>{member.user.name}</strong>
                    <small>{member.user.email}</small>
                  </div>
                  <div className="org-member-actions">
                    <select
                      aria-label={`Role for ${member.user.email}`}
                      value={
                        member.role.includes("owner")
                          ? "owner"
                          : member.role.includes("admin")
                            ? "admin"
                            : "member"
                      }
                      disabled={
                        !canManage || member.role.includes("owner") || busy
                      }
                      onChange={(event) =>
                        void updateRole(
                          member,
                          event.target.value as "member" | "admin",
                        )
                      }
                    >
                      {member.role.includes("owner") ? (
                        <option value="owner">Owner</option>
                      ) : null}
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                    {!member.role.includes("owner") ? (
                      <button
                        type="button"
                        className="org-danger"
                        disabled={!canManage || busy}
                        onClick={() => void removeMember(member)}
                      >
                        {confirmRemoveId === member.id
                          ? "Confirm remove"
                          : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {activeId && canManage ? (
          <section>
            <div className="org-section-title">
              <h2>Pending invitations</h2>
              <span>{invitations.length}</span>
            </div>
            {invitations.length ? (
              <ul>
                {invitations.map((invitation) => (
                  <li key={invitation.id}>
                    <div>
                      <strong>{invitation.email}</strong>
                      <small>
                        {invitation.role} · expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="org-danger"
                      disabled={busy}
                      onClick={() => void cancelInvitation(invitation.id)}
                    >
                      Cancel
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No pending invitations.</p>
            )}
          </section>
        ) : null}
        {message ? (
          <p role="status" className="org-message">
            {message}
          </p>
        ) : null}
      </main>
    </ProductShell>
  );
}

export function OrganizationInvitationPage() {
  const { data: session, isPending } = authClient.useSession();
  const [message, setMessage] = useState("");
  const invitationId =
    new URLSearchParams(window.location.search).get("id") || "";
  useEffect(() => {
    if (!isPending && !session?.user)
      window.location.replace(
        `/login?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`,
      );
  }, [isPending, session?.user?.id]);
  async function accept() {
    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (result.error)
      setMessage(result.error.message || "Invitation could not be accepted.");
    else window.location.replace("/app/team");
  }
  if (isPending || !session?.user)
    return <main className="org-loading">Loading invitation…</main>;
  return (
    <main className="org-invitation">
      <a href="/app">← Workspace</a>
      <h1>Organization invitation</h1>
      <p>
        Accepting adds your verified account to this organization. It does not
        grant platform Admin access.
      </p>
      <button
        type="button"
        disabled={!invitationId}
        onClick={() => void accept()}
      >
        Accept invitation
      </button>
      {message ? <p role="alert">{message}</p> : null}
    </main>
  );
}
