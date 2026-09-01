import { organizationClient } from "better-auth/client/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, memberAc, ownerAc } from "better-auth/plugins/organization/access";

const access = createAccessControl({ ...defaultStatements, project: ["create", "read", "update", "delete", "share"], branding: ["read", "update"] } as const);
const owner = access.newRole({ ...ownerAc.statements, project: ["create", "read", "update", "delete", "share"], branding: ["read", "update"] });
const admin = access.newRole({ ...adminAc.statements, project: ["create", "read", "update", "share"], branding: ["read", "update"] });
const member = access.newRole({ ...memberAc.statements, project: ["read"], branding: ["read"] });

export function createOrganizationAuthClientPlugin() {
  return organizationClient({ ac: access, roles: { owner, admin, member }, dynamicAccessControl: { enabled: true }, teams: { enabled: true } });
}
