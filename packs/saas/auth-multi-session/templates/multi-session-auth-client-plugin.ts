import { multiSessionClient } from "better-auth/client/plugins";
export function createMultiSessionAuthClientPlugin() {
  return multiSessionClient();
}
