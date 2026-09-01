import { lastLoginMethod } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createLastLoginAuthPlugin(_input: SelectedAuthPluginInput, _features: Record<string, boolean>) {
  return lastLoginMethod({ storeInDatabase: true, beforeStoreCookie: () => false, schema: { user: { lastLoginMethod: "last_login_method" } } });
}
