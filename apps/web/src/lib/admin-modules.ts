export type AdminModule = {
  id: string;
  label: string;
  description: string;
  group: "Workspace" | "People" | "Revenue" | "Engage" | "Operate";
  path: string;
  status: "available" | "planned";
};

export const adminModules: AdminModule[] = [
  { id: "overview", label: "Overview", description: "Platform activity, account growth and operational attention.", group: "Workspace", path: "/admin", status: "available" },
  { id: "settings", label: "Settings", description: "Platform identity, support contact and signup policy.", group: "Workspace", path: "/admin/settings", status: "available" },
  { id: "users", label: "Users & access", description: "Platform accounts, administrators, sessions and account controls.", group: "People", path: "/admin/access", status: "available" },
  { id: "organizations", label: "Organizations", description: "Tenant ownership, membership and invitations.", group: "People", path: "/admin/organizations", status: "available" },
  { id: "onboarding", label: "Onboarding", description: "Customer setup progress and completion.", group: "People", path: "/admin/onboarding", status: "available" },
  { id: "subscriptions", label: "Plans & subscriptions", description: "Independent product plans and subscription lifecycle.", group: "Revenue", path: "/admin/subscriptions", status: "available" },
  { id: "entitlements", label: "Entitlements", description: "Feature access, limits and plan grants.", group: "Revenue", path: "/admin/entitlements", status: "available" },
  { id: "usage", label: "Usage", description: "Metered usage and current buckets.", group: "Revenue", path: "/admin/usage", status: "available" },
  { id: "support", label: "Support inbox", description: "Customer conversations, assignments, replies and internal notes.", group: "Engage", path: "/admin/communications/support", status: "available" },
  { id: "notifications", label: "Announcements", description: "Publish product notices and review delivery history.", group: "Engage", path: "/admin/communications/announcements", status: "available" },
  { id: "analytics", label: "Analytics & scripts", description: "Publish lightweight external analytics destinations by environment and site surface.", group: "Engage", path: "/admin/growth/analytics", status: "available" },
  { id: "health", label: "System health", description: "Runtime, database and selected Provider evidence.", group: "Operate", path: "/admin/operations/health", status: "available" },
  { id: "api-keys", label: "API keys", description: "Scoped machine credentials and revocation evidence.", group: "Operate", path: "/admin/api-keys", status: "available" },
  { id: "webhooks", label: "Webhooks", description: "Endpoints, delivery state and retries.", group: "Operate", path: "/admin/webhooks", status: "available" },
  { id: "audit", label: "Audit log", description: "Search privileged platform changes and publication history.", group: "Operate", path: "/admin/operations/audit", status: "available" },
];

export const adminCapabilityCatalog = [
  { label: "Organizations", description: "Tenant membership and invitations.", pack: "saas.team-organizations" },
  { label: "Billing", description: "Plans, subscriptions and payment lifecycle.", pack: "saas.billing-stripe" },
  { label: "Entitlements", description: "Feature access, quotas and trials.", pack: "saas.entitlements" },
  { label: "Usage", description: "Metering and credits.", pack: "saas.usage" },
  { label: "API keys", description: "Scoped machine credentials.", pack: "saas.api-keys" },
  { label: "Webhooks", description: "Signed outgoing delivery and retries.", pack: "saas.outgoing-webhooks" },
];
