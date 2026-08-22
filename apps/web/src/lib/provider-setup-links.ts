export const providerSetupLinks = {
  google: [
    { label: "Google OAuth clients", href: "https://console.cloud.google.com/auth/clients" },
    { label: "Google OAuth setup guide", href: "https://developers.google.com/identity/protocols/oauth2/web-server" },
  ],
  cfsend: [
    { label: "Open CFsend Console", href: "https://send.all2cf.com/dashboard" },
    { label: "CFsend quickstart", href: "https://send.all2cf.com/docs/quickstart" },
  ],
  resend: [
    { label: "Resend API keys", href: "https://resend.com/api-keys" },
    { label: "Resend domains", href: "https://resend.com/domains" },
  ],
  "cloudflare-email-service": [
    { label: "Cloudflare Email Sending", href: "https://dash.cloudflare.com/?to=/:account/email-service/sending" },
    { label: "Email Service domain guide", href: "https://developers.cloudflare.com/email-service/configuration/domains/" },
  ],
  stripe: [
    { label: "Stripe test API keys", href: "https://dashboard.stripe.com/test/apikeys" },
    { label: "Stripe test webhooks", href: "https://dashboard.stripe.com/test/webhooks" },
    { label: "Stripe test products", href: "https://dashboard.stripe.com/test/products" },
  ],
  "s3-compatible": [
    { label: "AWS S3 credentials", href: "https://console.aws.amazon.com/iam/home#/security_credentials" },
    { label: "R2 S3 API tokens", href: "https://dash.cloudflare.com/?to=/:account/r2/api-tokens" },
  ],
  github: [
    { label: "Create a GitHub OAuth app", href: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app" },
  ],
  apple: [
    { label: "Configure Sign in with Apple", href: "https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple" },
  ],
  turnstile: [
    { label: "Create Turnstile widgets", href: "https://dash.cloudflare.com/?to=/:account/turnstile" },
    { label: "Turnstile setup guide", href: "https://developers.cloudflare.com/turnstile/get-started/" },
  ],
} as const;

export type ProviderSetupLinkId = keyof typeof providerSetupLinks;
