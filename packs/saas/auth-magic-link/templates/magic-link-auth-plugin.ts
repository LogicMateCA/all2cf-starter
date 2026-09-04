import { magicLink } from "better-auth/plugins";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function createMagicLinkAuthPlugin(
  input: SelectedAuthPluginInput,
  _features: Record<string, boolean>,
) {
  return magicLink({
    expiresIn: 10 * 60,
    sendMagicLink: async ({ email, url }) => {
      const safeAppName = escapeHtml(input.appName);
      const safeUrl = escapeHtml(url);
      return input.enqueueEmail({
        kind: "magic-link",
        to: email,
        subject: `Sign in to ${input.appName}`,
        text: `Use this one-time link to sign in: ${url}`,
        html: `<!doctype html><html><body><h1>Sign in to ${safeAppName}</h1><p><a href="${safeUrl}">Continue securely</a></p><p>This link expires in 10 minutes.</p></body></html>`,
        url,
      });
    },
  });
}
