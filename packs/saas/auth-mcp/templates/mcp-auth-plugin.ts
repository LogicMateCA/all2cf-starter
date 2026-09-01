import { mcp } from "@better-auth/mcp";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createMcpAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  const origin = new URL(input.baseURL).origin;
  return mcp({
    loginPage: "/auth",
    consentPage: "/mcp/consent",
    resource: `${origin}/mcp`,
    scopes: ["openid", "profile", "email", "offline_access", "mcp:tools"],
    allowDynamicClientRegistration: false,
    allowUnauthenticatedClientRegistration: false,
    clientPrivileges: ({ user }) =>
      String(user?.role || "")
        .split(",")
        .map((role) => role.trim())
        .includes("admin"),
  });
}
