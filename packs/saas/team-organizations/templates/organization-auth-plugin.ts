import { organization } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

type SelectedFeatures = { organizations: boolean; stripeBilling: boolean };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
}

export function createOrganizationAuthPlugin(input: SelectedAuthPluginInput, _features: SelectedFeatures) {
  return organization({
    teams: { enabled: true, allowRemovingAllTeams: false },
    invitationExpiresIn: 60 * 60 * 48,
    cancelPendingInvitationsOnReInvite: true,
    requireEmailVerificationOnInvitation: true,
    async sendInvitationEmail(data) {
      const url = `${input.baseURL}/app/invitation?id=${encodeURIComponent(data.id)}`;
      const organizationName = data.organization.name;
      const inviterName = data.inviter.user.name || data.inviter.user.email;
      await input.enqueueEmail({
        kind: "organization-invitation",
        to: data.email,
        subject: `Join ${organizationName}`,
        text: `${inviterName} invited you to join ${organizationName}: ${url}`,
        html: `<!doctype html><html><body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#111827"><div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #dbe3ee;border-radius:16px;padding:32px"><h1 style="font-size:24px;margin:0 0 14px">Join ${escapeHtml(organizationName)}</h1><p style="line-height:1.65;color:#475569">${escapeHtml(inviterName)} invited you to join their workspace.</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:10px;padding:12px 18px;border-radius:9px;background:#172033;color:#fff;text-decoration:none;font-weight:700">Review invitation</a></div></body></html>`,
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
    },
  });
}
