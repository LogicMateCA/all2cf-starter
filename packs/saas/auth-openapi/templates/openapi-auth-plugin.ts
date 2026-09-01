import { openAPI } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createOpenApiAuthPlugin(_input: SelectedAuthPluginInput, _features: Record<string, boolean>) { return openAPI({ path: "/reference", theme: "kepler" }); }
