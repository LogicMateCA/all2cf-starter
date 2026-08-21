export type AdminModuleStatus =
  "available" | "partial" | "optional" | "planned";

export type AdminModule = {
  id: string;
  label: string;
  description: string;
  owner: string;
  status: AdminModuleStatus;
  requiredPack?: string;
  href?: string;
};

export const adminModules: AdminModule[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Platform counts and operational state.",
    owner: "Starter Admin",
    status: "available",
  },
  {
    id: "users",
    label: "Users",
    description: "Better Auth platform users and roles.",
    owner: "Better Auth Admin",
    status: "available",
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Tenant membership and invitations.",
    owner: "Better Auth Organization",
    status: "optional",
    requiredPack: "saas.team-organizations",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Plans, subscriptions and Stripe lifecycle.",
    owner: "Better Auth Stripe",
    status: "optional",
    requiredPack: "saas.billing-stripe",
  },
  {
    id: "entitlements",
    label: "Entitlements",
    description: "Plans, feature access, quotas and trials.",
    owner: "Starter Entitlements",
    status: "optional",
    requiredPack: "saas.entitlements",
  },
  {
    id: "usage",
    label: "Usage",
    description: "Metering, aggregation and credits.",
    owner: "Starter Usage",
    status: "optional",
    requiredPack: "saas.usage",
  },
  {
    id: "api-keys",
    label: "API Keys",
    description: "Scoped machine credentials and revocation.",
    owner: "Better Auth API Key",
    status: "optional",
    requiredPack: "saas.api-keys",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    description: "Signed outgoing delivery and retry evidence.",
    owner: "Starter Outgoing Webhooks",
    status: "optional",
    requiredPack: "saas.outgoing-webhooks",
    href: "/admin/webhooks",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    description: "First-session progress and completion adoption.",
    owner: "Starter Product Onboarding",
    status: "optional",
    requiredPack: "saas.onboarding",
  },
  {
    id: "support",
    label: "Support",
    description: "Ticket threads, public replies and internal notes.",
    owner: "Starter Support",
    status: "available",
  },
  {
    id: "notifications",
    label: "Notifications & announcements",
    description: "Inbox delivery, platform announcements and module event producers.",
    owner: "Starter Notifications",
    status: "available",
  },
  {
    id: "audit",
    label: "Audit",
    description: "Privileged platform mutations.",
    owner: "Starter Admin",
    status: "available",
  },
  {
    id: "health",
    label: "System Health",
    description: "Worker liveness, database latency and provider evidence.",
    owner: "Starter Operations",
    status: "available",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Platform-level defaults and policies.",
    owner: "Starter Admin",
    status: "planned",
  },
];
