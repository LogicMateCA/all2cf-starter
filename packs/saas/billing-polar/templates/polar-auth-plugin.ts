import { checkout, polar, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";
import type { SelectedAuthPluginInput } from "../generated/auth-plugins";

const required = (value: string | undefined, name: string) => {
  if (!value?.trim()) throw new Error(`${name} is required while saas.billing-polar is selected`);
  return value.trim();
};

export function createPolarAuthPlugin(input: SelectedAuthPluginInput, _features?: unknown) {
  const accessToken = required(input.polarAccessToken, "POLAR_ACCESS_TOKEN");
  const webhookSecret = required(input.polarWebhookSecret, "POLAR_WEBHOOK_SECRET");
  const productId = required(input.polarProductPro, "POLAR_PRODUCT_PRO");
  const client = new Polar({ accessToken, server: input.appEnvironment === "production" ? "production" : "sandbox" });
  return polar({
    client,
    createCustomerOnSignUp: true,
    use: [
      checkout({ products: [{ productId, slug: "pro" }], successUrl: `${input.baseURL}/app/billing?checkout=success`, returnUrl: `${input.baseURL}/app/billing`, authenticatedUsersOnly: true }),
      portal({ returnUrl: `${input.baseURL}/app/billing` }),
      usage(),
      webhooks({ secret: webhookSecret }),
    ],
  });
}
