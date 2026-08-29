import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient } from "better-auth/client/plugins";
import { createSelectedAuthClientPlugins } from "../generated/auth-plugins";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? undefined : window.location.origin,
  basePath: "/api/auth",
  plugins: [emailOTPClient(), adminClient(), ...createSelectedAuthClientPlugins()],
});

export type AuthSession = typeof authClient.$Infer.Session;
