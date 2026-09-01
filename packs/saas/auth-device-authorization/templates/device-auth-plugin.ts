import { oauthDeviceAuthorization } from "@better-auth/oauth-provider";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";
export function createDeviceAuthPlugin(_input:SelectedAuthPluginInput,_features:Record<string,boolean>){return oauthDeviceAuthorization({verificationUri:"/device",expiresIn:"10m",interval:"5s"});}
