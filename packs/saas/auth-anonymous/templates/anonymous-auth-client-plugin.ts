import { anonymousClient } from "better-auth/client/plugins";

export function createAnonymousAuthClientPlugin() {
  return anonymousClient();
}
