import { phoneNumberClient } from "better-auth/client/plugins";
export function createPhoneAuthClientPlugin() {
  return phoneNumberClient();
}
