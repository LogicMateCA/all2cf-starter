import { FormEvent, useEffect, useState } from "react";
import { ProductShell } from "../product-shell";
import { authClient } from "../../lib/auth-client";
import "./organization-page.css";

type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | string | null;
};
type OrganizationBranding = {
  brandColor?: string;
  supportEmail?: string;
  emailFromName?: string;
  customDomain?: string;
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
type OrganizationTeam = {
  id: string;
  name: string;
  organizationId: string;
  createdAt: string | Date;
};
type OrganizationTeamMember = { id: string; userId: string; teamId: string };
type OrganizationCustomRole = { id: string; role: string; permission: Record<string, string[]> };

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
  const [brandLogo, setBrandLogo] = useState("");
  const [activeName, setActiveName] = useState("");
  const [activeSlug, setActiveSlug] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [brandColor, setBrandColor] = useState("#172033");
  const [supportEmail, setSupportEmail] = useState("");
  const [emailFromName, setEmailFromName] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [teams, setTeams] = useState<OrganizationTeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<
    Record<string, OrganizationTeamMember[]>
  >({});
  const [teamName, setTeamName] = useState("");
  const [activeTeamId, setActiveTeamId] = useState("");
  const [customRoles, setCustomRoles] = useState<OrganizationCustomRole[]>([]);
  const [customRoleName, setCustomRoleName] = useState("");
  const [customRoleTemplate, setCustomRoleTemplate] = useState<"viewer" | "editor">("viewer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const canManage = activeRole
    .split(",")
    .some((role) => ["owner", "admin"].includes(role.trim()));
  const branding = (
    organization: OrganizationSummary | null,
  ): OrganizationBranding => {
    if (!organization?.metadata) return {};
    if (typeof organization.metadata === "object")
      return organization.metadata as OrganizationBranding;
    try {
      return JSON.parse(organization.metadata) as OrganizationBranding;
    } catch {
      return {};
    }
  };
  const loadBranding = (organization: OrganizationSummary | null) => {
    const value = branding(organization);
    setActiveName(organization?.name || "");
    setActiveSlug(organization?.slug || "");
    setBrandLogo(organization?.logo || "");
    setBrandColor(value.brandColor || "#172033");
    setSupportEmail(value.supportEmail || "");
    setEmailFromName(value.emailFromName || "");
    setCustomDomain(value.customDomain || "");
    setDeleteConfirmation("");
  };

  async function refreshOrganization(organizationId: string | null) {
    if (!organizationId) {
      setMembers([]);
      setInvitations([]);
      setTeams([]);
      setTeamMembers({});
      setCustomRoles([]);
      setActiveRole("");
      return;
    }
    const [memberResult, roleResult, teamResult, customRoleResult] = await Promise.all([
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
      authClient.organization.listTeams({ query: { organizationId } }),
      authClient.organization.listRoles({ query: { organizationId } }),
    ]);
    if (memberResult.error || roleResult.error || teamResult.error || customRoleResult.error) {
      setMessage(
        memberResult.error?.message ||
          roleResult.error?.message ||
          teamResult.error?.message ||
          customRoleResult.error?.message ||
          "Organization members could not be loaded.",
      );
      return;
    }
    const role = roleResult.data?.role || "";
    setMembers((memberResult.data?.members || []) as OrganizationMember[]);
    const nextTeams = (teamResult.data || []) as OrganizationTeam[];
    setTeams(nextTeams);
    const entries = await Promise.all(
      nextTeams.map(
        async (team) =>
          [
            team.id,
            ((
              await authClient.organization.listTeamMembers({
                query: { teamId: team.id },
              })
            ).data || []) as OrganizationTeamMember[],
          ] as const,
      ),
    );
    setTeamMembers(Object.fromEntries(entries));
    setCustomRoles((customRoleResult.data || []) as OrganizationCustomRole[]);
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
    loadBranding(active);
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
      setMessage(result.error.message || "Organization could not be created.");
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

  async function saveBranding(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !canManage) return;
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.update({
      organizationId: activeId,
      data: {
        name: activeName.trim(),
        slug: activeSlug.trim().toLowerCase(),
        logo: brandLogo.trim() || null,
        metadata: {
          brandColor,
          supportEmail: supportEmail.trim(),
          emailFromName: emailFromName.trim(),
          customDomain: customDomain.trim().toLowerCase(),
        },
      },
    });
    if (result.error)
      setMessage(
        result.error.message || "Organization branding could not be saved.",
      );
    else {
      setMessage("Organization branding saved.");
      await refresh();
    }
    setBusy(false);
  }

  async function createTeam(event: FormEvent) {
    event.preventDefault();
    if (!activeId || !canManage || !teamName.trim()) return;
    setBusy(true);
    setMessage("");
    const result = await authClient.organization.createTeam({
      name: teamName.trim(),
      organizationId: activeId,
    });
    if (result.error)
      setMessage(result.error.message || "Team could not be created.");
    else {
      setTeamName("");
      setMessage("Team created.");
      await refreshOrganization(activeId);
    }
    setBusy(false);
  }
  async function useTeam(teamId: string) {
    const result = await authClient.organization.setActiveTeam({ teamId });
    if (result.error)
      setMessage(result.error.message || "Team could not be selected.");
    else {
      setActiveTeamId(teamId);
      setMessage("Active team changed.");
    }
  }
  async function addTeamMember(teamId: string, userId: string) {
    if (!activeId) return;
    setBusy(true);
    const result = await authClient.organization.addTeamMember({
      teamId,
      userId,
      organizationId: activeId,
    });
    if (result.error)
      setMessage(result.error.message || "Team member could not be added.");
    else await refreshOrganization(activeId);
    setBusy(false);
  }
  async function removeTeamMember(teamId: string, userId: string) {
    setBusy(true);
    const result = await authClient.organization.removeTeamMember({
      teamId,
      userId,
    });
    if (result.error)
      setMessage(result.error.message || "Team member could not be removed.");
    else await refreshOrganization(activeId);
    setBusy(false);
  }
  async function removeTeam(teamId: string) {
    if (!activeId) return;
    setBusy(true);
    const result = await authClient.organization.removeTeam({
      teamId,
      organizationId: activeId,
    });
    if (result.error)
      setMessage(result.error.message || "Team could not be removed.");
    else await refreshOrganization(activeId);
    setBusy(false);
  }
  async function createCustomRole(event: FormEvent) {
    event.preventDefault(); if (!activeId || !canManage || !customRoleName.trim()) return; setBusy(true);
    const permission = customRoleTemplate === "editor" ? { project: ["read", "create", "update", "share"], branding: ["read"] } : { project: ["read"], branding: ["read"] };
    const result = await authClient.organization.createRole({ organizationId: activeId, role: customRoleName.trim().toLowerCase(), permission });
    if (result.error) setMessage(result.error.message || "Custom role could not be created."); else { setCustomRoleName(""); await refreshOrganization(activeId); } setBusy(false);
  }
  async function deleteCustomRole(roleName: string) {
    if (!activeId) return; setBusy(true); const result = await authClient.organization.deleteRole({ organizationId: activeId, roleName });
    if (result.error) setMessage(result.error.message || "Custom role could not be deleted."); else await refreshOrganization(activeId); setBusy(false);
  }
  async function deleteOrganization() {
    if (!activeId || !activeRole.includes("owner") || deleteConfirmation !== activeSlug) return;
    setBusy(true);
    const result = await authClient.organization.delete({ organizationId: activeId });
    if (result.error) setMessage(result.error.message || "Organization could not be deleted."); else { setMessage("Organization deleted."); await refresh(); }
    setBusy(false);
  }
  async function leaveOrganization() {
    if (!activeId || activeRole.includes("owner")) return;
    setBusy(true);
    const result = await authClient.organization.leave({ organizationId: activeId });
    if (result.error) setMessage(result.error.message || "Organization could not be left."); else { setMessage("You left the organization."); await refresh(); }
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
            Create tenant workspaces, switch active context, manage members, and
            deliver verified invitations through the configured email provider.
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
        {activeId && canManage ? (
          <form className="org-branding" onSubmit={saveBranding}>
            <div className="org-section-title">
              <div>
                <h2>Organization branding</h2>
                <small>
                  Normal tenant branding; this does not grant platform Admin
                  access.
                </small>
              </div>
            </div>
            <div className="org-branding-grid">
              <label>
                Organization name
                <input required value={activeName} onChange={(event) => setActiveName(event.target.value)} />
              </label>
              <label>
                Organization slug
                <input required pattern="[a-z0-9-]+" value={activeSlug} onChange={(event) => setActiveSlug(event.target.value)} />
              </label>
              <label>
                Logo URL
                <input
                  type="url"
                  value={brandLogo}
                  onChange={(event) => setBrandLogo(event.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </label>
              <label>
                Brand color
                <input
                  type="color"
                  value={brandColor}
                  onChange={(event) => setBrandColor(event.target.value)}
                />
              </label>
              <label>
                Support email
                <input
                  type="email"
                  value={supportEmail}
                  onChange={(event) => setSupportEmail(event.target.value)}
                />
              </label>
              <label>
                Email sender name
                <input
                  value={emailFromName}
                  onChange={(event) => setEmailFromName(event.target.value)}
                />
              </label>
              <label>
                Custom domain
                <input
                  value={customDomain}
                  onChange={(event) => setCustomDomain(event.target.value)}
                  placeholder="app.customer.com"
                />
              </label>
            </div>
            <button type="submit" disabled={busy}>
              Save branding
            </button>
            <p>
              Custom domains remain unverified until the product domain workflow
              proves DNS ownership.
            </p>
            {activeRole.includes("owner") ? <div className="org-delete"><label>Type <strong>{activeSlug}</strong> to delete<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label><button type="button" className="org-danger" disabled={busy || deleteConfirmation !== activeSlug} onClick={() => void deleteOrganization()}>Delete organization</button></div> : <button type="button" className="org-danger" disabled={busy} onClick={() => void leaveOrganization()}>Leave organization</button>}
          </form>
        ) : null}
        {activeId && canManage ? (
          <section className="org-roles">
            <div className="org-section-title"><div><h2>Custom roles</h2><small>Organization-scoped roles; they never grant platform Admin.</small></div><span>{customRoles.length}</span></div>
            <form onSubmit={createCustomRole}><label>Role name<input value={customRoleName} pattern="[a-zA-Z0-9-]+" onChange={(event) => setCustomRoleName(event.target.value)} /></label><label>Permission template<select value={customRoleTemplate} onChange={(event) => setCustomRoleTemplate(event.target.value as "viewer" | "editor")}><option value="viewer">Viewer</option><option value="editor">Project editor</option></select></label><button type="submit" disabled={busy || !customRoleName.trim()}>Create role</button></form>
            <ul>{customRoles.map((role) => <li key={role.id}><div><strong>{role.role}</strong><small>{Object.entries(role.permission || {}).map(([resource, actions]) => `${resource}: ${actions.join(", ")}`).join(" · ")}</small></div><button type="button" className="org-danger" disabled={busy} onClick={() => void deleteCustomRole(role.role)}>Delete</button></li>)}</ul>
          </section>
        ) : null}
        {activeId ? (
          <section className="org-teams">
            <div className="org-section-title">
              <div>
                <h2>Teams</h2>
                <small>Group organization members without changing platform authority.</small>
              </div>
              <span>{teams.length}</span>
            </div>
            {canManage ? (
              <form onSubmit={createTeam}>
                <label>New team<input value={teamName} onChange={(event) => setTeamName(event.target.value)} /></label>
                <button type="submit" disabled={busy || !teamName.trim()}>Create team</button>
              </form>
            ) : null}
            <ul>
              {teams.map((team) => (
                <li key={team.id}>
                  <div>
                    <strong>{team.name}</strong>
                    <small>{(teamMembers[team.id] || []).length} members</small>
                    <div className="org-team-members">
                      {members.map((member) => {
                        const included = (teamMembers[team.id] || []).some((item) => item.userId === member.userId);
                        return <button type="button" key={member.userId} disabled={!canManage || busy} aria-pressed={included} onClick={() => void (included ? removeTeamMember(team.id, member.userId) : addTeamMember(team.id, member.userId))}>{member.user.name}</button>;
                      })}
                    </div>
                  </div>
                  <div className="org-member-actions">
                    <button type="button" aria-pressed={activeTeamId === team.id} onClick={() => void useTeam(team.id)}>{activeTeamId === team.id ? "Active" : "Use team"}</button>
                    {canManage ? <button type="button" className="org-danger" disabled={busy || teams.length <= 1} onClick={() => void removeTeam(team.id)}>Remove</button> : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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
  async function reject() {
    const result = await authClient.organization.rejectInvitation({ invitationId });
    if (result.error) setMessage(result.error.message || "Invitation could not be rejected."); else window.location.replace("/app");
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
      <button type="button" className="org-danger" disabled={!invitationId} onClick={() => void reject()}>Reject invitation</button>
      {message ? <p role="alert">{message}</p> : null}
    </main>
  );
}
