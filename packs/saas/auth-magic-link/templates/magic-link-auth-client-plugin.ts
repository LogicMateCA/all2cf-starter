import { magicLinkClient } from "better-auth/client/plugins";
export function createMagicLinkAuthClientPlugin() {
  return magicLinkClient();
}
