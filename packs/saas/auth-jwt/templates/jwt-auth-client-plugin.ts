import { jwtClient } from "better-auth/client/plugins";
export function createJwtAuthClientPlugin() { return jwtClient(); }
