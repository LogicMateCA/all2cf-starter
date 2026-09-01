import { anonymous } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

export function createAnonymousAuthPlugin(
  _input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return anonymous({
    emailDomainName: "anonymous.placeholder.invalid",
    disableDeleteAnonymousUser: false,
    generateName: () => "Guest",
    schema: { user: { fields: { isAnonymous: "is_anonymous" } } },
  });
}
