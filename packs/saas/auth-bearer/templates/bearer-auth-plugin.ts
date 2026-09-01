import { bearer } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createBearerAuthPlugin(_input: SelectedAuthPluginInput, _features: Record<string, boolean>) { return bearer(); }
