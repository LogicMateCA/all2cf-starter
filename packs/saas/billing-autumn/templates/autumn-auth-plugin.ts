import { autumn } from "autumn-js/better-auth";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createAutumnAuthPlugin(input: SelectedAuthPluginInput, _features?: unknown) {
  if (!input.autumnSecretKey?.trim()) throw new Error("AUTUMN_SECRET_KEY is required while saas.billing-autumn is selected");
  return autumn({ secretKey: input.autumnSecretKey.trim(), customerScope: "user" });
}
