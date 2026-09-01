import { organization } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

type SelectedFeatures = { organizations: boolean; stripeBilling: boolean };

const access = createAccessControl({ ...defaultStatements, project: ["create", "read", "update", "delete", "share"], branding: ["read", "update"] } as const);
const owner = access.newRole({ ...ownerAc.statements, project: ["create", "read", "update", "delete", "share"], branding: ["read", "update"] });
const admin = access.newRole({ ...adminAc.statements, project: ["create", "read", "update", "share"], branding: ["read", "update"] });
const member = access.newRole({ ...memberAc.statements, project: ["read"], branding: ["read"] });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}
function branding(metadata: unknown) {
  if (metadata && typeof metadata === "object") return metadata as { brandColor?: string; emailFromName?: string; supportEmail?: string };
  if (typeof metadata === "string") try { return JSON.parse(metadata) as { brandColor?: string; emailFromName?: string; supportEmail?: string }; } catch { return {}; }
  return {};
}

export function createOrganizationAuthPlugin(input: SelectedAuthPluginInput, _features: SelectedFeatures) {
  const planFor = async (referenceId: string) => {
    const result = await input.database.query<{ plan: string }>(`select plan from app_subscription where reference_id=$1 and status in ('active','trialing') order by case when status='active' then 0 else 1 end limit 1`, [referenceId]).catch(() => ({ rows: [] as { plan: string }[] }));
    return result.rows[0]?.plan || "free";
  };
  const notify = async (userId: string, title: string, body: string, organizationId: string) => {
    await input.database.query(
      `insert into app_notification (id, recipient_user_id, category, title, body, deep_link)
       values ($1, $2, 'organization', $3, $4, $5)`,
      [crypto.randomUUID(), userId, title, body, `/app/team?organization=${encodeURIComponent(organizationId)}`],
    );
  };
  const notifyEmailOwner = async (email: string, title: string, body: string, organizationId: string) => {
    const user = await input.database.query<{ id: string }>(
      "select id from app_user where lower(email) = lower($1) and email_verified = true limit 1",
      [email],
    );
    if (user.rows[0]?.id) await notify(user.rows[0].id, title, body, organizationId);
  };
  return organization({
    ac: access,
    roles: { owner, admin, member },
    dynamicAccessControl: { enabled: true, maximumRolesPerOrganization: 20 },
    allowUserToCreateOrganization: true,
    organizationLimit: async (user) => {
      if ((await planFor(user.id)) === "pro") return false;
      const result = await input.database.query<{ count: number }>(`select count(*)::int count from app_organization_member where user_id=$1 and role like '%owner%'`, [user.id]);
      return Number(result.rows[0]?.count || 0) >= 3;
    },
    membershipLimit: async (_user, organization) => (await planFor(organization.id)) === "pro" ? 100 : 10,
    invitationLimit: 100,
    teams: {
      enabled: true,
      allowRemovingAllTeams: false,
      maximumTeams: async ({ organizationId }) => (await planFor(organizationId)) === "pro" ? 20 : 3,
      maximumMembersPerTeam: async ({ organizationId }) => (await planFor(organizationId)) === "pro" ? 50 : 10,
    },
    invitationExpiresIn: 60 * 60 * 48,
    cancelPendingInvitationsOnReInvite: true,
    requireEmailVerificationOnInvitation: true,
    organizationHooks: {
      async afterCreateOrganization({ organization, user }) {
        await notify(
          user.id,
          "Workspace created",
          `${organization.name} is ready to use.`,
          organization.id,
        );
      },
      async afterUpdateMemberRole({ member, previousRole, user, organization }) {
        await notify(
          user.id,
          "Organization role changed",
          `Your role in ${organization.name} changed from ${previousRole} to ${member.role}.`,
          organization.id,
        );
      },
      async afterRemoveMember({ user, organization }) {
        await notify(
          user.id,
          "Organization access removed",
          `Your access to ${organization.name} was removed.`,
          organization.id,
        );
      },
      async afterCreateInvitation({ invitation, organization }) {
        await notifyEmailOwner(
          invitation.email,
          "Organization invitation",
          `You were invited to join ${organization.name}.`,
          organization.id,
        );
      },
      async afterAcceptInvitation({ user, organization }) {
        await notify(
          user.id,
          "Organization joined",
          `You joined ${organization.name}.`,
          organization.id,
        );
      },
      async afterCancelInvitation({ invitation, organization }) {
        await notifyEmailOwner(
          invitation.email,
          "Organization invitation cancelled",
          `The invitation to join ${organization.name} was cancelled.`,
          organization.id,
        );
      },
    },
    async sendInvitationEmail(data) {
      const url = `${input.baseURL}/app/invitation?id=${encodeURIComponent(data.id)}`;
      const organizationName = data.organization.name;
      const inviterName = data.inviter.user.name || data.inviter.user.email;
      const brand = branding(data.organization.metadata);
      const brandColor = /^#[0-9a-f]{6}$/iu.test(brand.brandColor || "") ? brand.brandColor! : "#172033";
      const senderName = brand.emailFromName?.trim() || organizationName;
      await input.enqueueEmail({
        kind: "organization-invitation",
        to: data.email,
        subject: `${senderName} invited you to join ${organizationName}`,
        text: `${inviterName} invited you to join ${organizationName}: ${url}`,
        html: `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:32px"><p style="color:${brandColor};font-weight:700">${escapeHtml(senderName)}</p><h1 style="font-size:24px;margin:0 0 14px">Join ${escapeHtml(organizationName)}</h1><p style="line-height:1.65;color:#475569">${escapeHtml(inviterName)} invited you to join their workspace.</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:9px;background:${brandColor};color:#fff;text-decoration:none;font-weight:700">Review invitation</a>${brand.supportEmail ? `<p style="margin-top:24px;color:#64748b">Support: ${escapeHtml(brand.supportEmail)}</p>` : ""}</div></body></html>`,
        url,
      });
    },
    schema: {
      session: { fields: { activeOrganizationId: "active_organization_id", activeTeamId: "active_team_id" } },
      organization: { modelName: "app_organization", fields: { createdAt: "created_at" } },
      member: { modelName: "app_organization_member", fields: { organizationId: "organization_id", userId: "user_id", createdAt: "created_at" } },
      invitation: { modelName: "app_organization_invitation", fields: { organizationId: "organization_id", teamId: "team_id", inviterId: "inviter_id", expiresAt: "expires_at", createdAt: "created_at" } },
      team: { modelName: "app_team", fields: { memberCount: "member_count", organizationId: "organization_id", createdAt: "created_at", updatedAt: "updated_at" } },
      teamMember: { modelName: "app_team_member", fields: { teamId: "team_id", userId: "user_id", membershipKey: "membership_key", createdAt: "created_at" } },
      organizationRole: { modelName: "app_organization_role", fields: { organizationId: "organization_id", createdAt: "created_at", updatedAt: "updated_at" } },
    },
  });
}
