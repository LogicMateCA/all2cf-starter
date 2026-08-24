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
  "workers-ai": [
    { label: "Workers AI models", href: "https://developers.cloudflare.com/workers-ai/models/" },
    { label: "AI Gateway", href: "https://dash.cloudflare.com/?to=/:account/ai/ai-gateway" },
  ],
  vectorize: [
    { label: "Vectorize dashboard", href: "https://dash.cloudflare.com/?to=/:account/workers/vectorize" },
    { label: "Vectorize documentation", href: "https://developers.cloudflare.com/vectorize/" },
  ],
  "expo-push": [
    { label: "Expo Push setup", href: "https://docs.expo.dev/push-notifications/push-notifications-setup/" },
    { label: "Expo credentials", href: "https://expo.dev/accounts" },
  ],
  "twilio-sms": [
    { label: "Twilio API keys", href: "https://console.twilio.com/us1/account/keys-credentials/api-keys" },
    { label: "Twilio phone numbers", href: "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming" },
  ],
  "cloudflare-images": [
    { label: "Images binding guide", href: "https://developers.cloudflare.com/images/optimization/binding/" },
    { label: "Images dashboard", href: "https://dash.cloudflare.com/?to=/:account/images" },
  ],
  "cloudflare-stream": [
    { label: "Stream direct uploads", href: "https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/" },
    { label: "Stream webhooks", href: "https://developers.cloudflare.com/stream/manage-video-library/using-webhooks/" },
  ],
  "cloudflare-release": [
    { label: "Cloudflare API tokens", href: "https://dash.cloudflare.com/profile/api-tokens" },
    { label: "Wrangler deploy guide", href: "https://developers.cloudflare.com/workers/wrangler/commands/#deploy" },
  ],
  "github-release": [
    { label: "GitHub fine-grained tokens", href: "https://github.com/settings/personal-access-tokens" },
  ],
  "expo-eas": [
    { label: "Expo access tokens", href: "https://expo.dev/accounts" },
    { label: "EAS project setup", href: "https://docs.expo.dev/build/setup/" },
  ],
  "mobile-local-build": [
    { label: "Expo local builds", href: "https://docs.expo.dev/guides/local-app-overview/" },
    { label: "Android signed builds", href: "https://developer.android.com/studio/publish/app-signing" },
    { label: "Xcode archives", href: "https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases" },
  ],
  "apple-app-store": [
    { label: "App Store Connect API", href: "https://appstoreconnect.apple.com/access/integrations/api" },
    { label: "API key guide", href: "https://developer.apple.com/documentation/appstoreconnectapi/creating-api-keys-for-app-store-connect-api" },
  ],
  "google-play": [
    { label: "Google Play Console", href: "https://play.google.com/console/" },
    { label: "Service account setup", href: "https://developers.google.com/android-publisher/getting_started" },
  ],
} as const;

export type ProviderSetupLinkId = keyof typeof providerSetupLinks;
