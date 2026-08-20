import { stripeClient } from "@better-auth/stripe/client";

export function createStripeAuthClientPlugin() {
  return stripeClient({ subscription: true });
}
