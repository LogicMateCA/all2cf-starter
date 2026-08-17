const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const betterAuthReact = require.resolve("better-auth/react", { paths: [__dirname] });
const betterAuthCookieUtils = path.resolve(path.dirname(betterAuthReact), "../../cookies/cookie-utils.mjs");

// @better-auth/expo only needs cookie parsing helpers, but its public barrel also
// pulls server session/schema code into Metro (including all Zod locales). Point
// that one import at Better Auth's own focused runtime module and revalidate this
// path on every aligned Better Auth upgrade.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "better-auth/cookies") return context.resolveRequest(context, betterAuthCookieUtils, platform);
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
