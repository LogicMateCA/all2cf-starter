import { lastLoginMethodClient } from "better-auth/client/plugins";
export function createLastLoginAuthClientPlugin() { return lastLoginMethodClient(); }
