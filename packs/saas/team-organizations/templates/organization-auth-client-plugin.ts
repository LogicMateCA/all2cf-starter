import { organizationClient } from "better-auth/client/plugins";

export function createOrganizationAuthClientPlugin() {
  return organizationClient({ teams: { enabled: true } });
}
