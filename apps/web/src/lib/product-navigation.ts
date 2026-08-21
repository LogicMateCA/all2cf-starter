import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookOpen,
  Code2,
  CreditCard,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
} from "lucide-react";

export type ProductPermission = "admin";

export type ProductNavigationItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  keywords: string[];
  module?: string;
  permission?: ProductPermission;
};

export const productNavigation: ProductNavigationItem[] = [
  {
    id: "workspace",
    label: "Workspace",
    description: "Your product workspace",
    href: "/app",
    icon: LayoutDashboard,
    keywords: ["home", "dashboard", "workspace"],
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "System and product updates",
    href: "/app/notifications",
    icon: Bell,
    keywords: ["alerts", "updates", "inbox"],
  },
  {
    id: "organizations",
    label: "Organizations",
    description: "Teams and member access",
    href: "/app/team",
    icon: Users,
    keywords: ["team", "members", "invitations", "organization"],
    module: "saas.team-organizations",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Plans and subscription",
    href: "/app/billing",
    icon: CreditCard,
    keywords: ["stripe", "plan", "subscription", "payment"],
    module: "saas.billing-stripe",
  },
  {
    id: "entitlements",
    label: "Plan & Access",
    description: "Features and plan limits",
    href: "/app/entitlements",
    icon: ShieldCheck,
    keywords: ["plan", "feature", "quota", "access"],
    module: "saas.entitlements",
  },
  {
    id: "usage",
    label: "Usage",
    description: "Metered product activity",
    href: "/app/usage",
    icon: Gauge,
    keywords: ["meter", "quota", "limit", "consumption"],
    module: "saas.usage",
  },
  {
    id: "developer",
    label: "Developer",
    description: "API access, usage, and delivery",
    href: "/app/developer",
    icon: Code2,
    keywords: ["api", "developer", "integration", "webhooks", "usage"],
    module: "saas.api-platform",
  },
  {
    id: "api-keys",
    label: "API Keys",
    description: "Machine credentials and scopes",
    href: "/app/api-keys",
    icon: KeyRound,
    keywords: ["developer", "token", "credential", "scope"],
    module: "saas.api-keys",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    description: "Signed event delivery",
    href: "/app/webhooks",
    icon: Webhook,
    keywords: ["developer", "events", "delivery", "queue"],
    module: "saas.outgoing-webhooks",
  },
  {
    id: "settings",
    label: "Settings",
    description: "Account and preferences",
    href: "/app/settings",
    icon: Settings,
    keywords: ["account", "profile", "security", "language", "theme"],
  },
  {
    id: "support",
    label: "Support",
    description: "Questions and bug reports",
    href: "/support",
    icon: LifeBuoy,
    keywords: ["help", "ticket", "bug"],
  },
  {
    id: "admin",
    label: "Admin",
    description: "Platform operations",
    href: "/admin",
    icon: ShieldCheck,
    keywords: ["users", "audit", "operations", "health"],
    permission: "admin",
  },
  {
    id: "docs",
    label: "Documentation",
    description: "Product guides and reference",
    href: "/docs",
    icon: BookOpen,
    keywords: ["docs", "guides", "reference"],
  },
];

export type ProductNavigationContext = {
  isAdmin: boolean;
  enabledModules?: ReadonlySet<string>;
};

export function visibleProductNavigation({
  isAdmin,
  enabledModules = new Set<string>(),
}: ProductNavigationContext) {
  return productNavigation.filter((item) => {
    if (item.permission === "admin" && !isAdmin) return false;
    if (item.module && !enabledModules.has(item.module)) return false;
    return true;
  });
}

export function searchProductNavigation(
  query: string,
  items: ProductNavigationItem[],
) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];
  return items.filter((item) =>
    [item.label, item.description, ...item.keywords].some((value) =>
      value.toLocaleLowerCase().includes(normalized),
    ),
  );
}

export function isProductNavigationActive(
  item: ProductNavigationItem,
  pathname: string,
) {
  return item.href === "/app"
    ? pathname === "/app"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
